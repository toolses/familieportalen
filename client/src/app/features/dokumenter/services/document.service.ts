import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { firebaseDb as db, firebaseStorage } from '../../../core/firebase';
import { HouseholdService } from '../../../shared/services/household.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ArchiveDocument, DocumentCategory } from '../models/document.models';
import { AssignedTo } from '../../school-plan/models/school-plan.models';
import { firstValueFrom } from 'rxjs';

export interface UploadProgress {
  percent: number;
  done: boolean;
  error?: string;
  document?: ArchiveDocument;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private household = inject(HouseholdService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private unsub: Unsubscribe | null = null;

  readonly documents = signal<ArchiveDocument[]>([]);
  readonly loading = signal(true);

  constructor() {
    // Subscribe only when both user and householdId are ready
    effect(() => {
      const householdId = this.household.householdId();
      const user = this.auth.user();
      if (householdId && user) {
        untracked(() => this.subscribe(householdId));
      } else {
        untracked(() => {
          this.unsub?.();
          this.unsub = null;
          this.documents.set([]);
          this.loading.set(true);
        });
      }
    });
  }

  private subscribe(householdId: string): void {
    this.unsub?.();
    const q = query(
      collection(db, `households/${householdId}/documents`),
      orderBy('uploadedAt', 'desc'),
    );
    this.unsub = onSnapshot(
      q,
      (snap) => {
        this.documents.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArchiveDocument)));
        this.loading.set(false);
      },
      (err) => {
        console.error('[DocumentService] onSnapshot feil:', err);
        this.loading.set(false);
      },
    );
  }

  upload(
    file: Blob,
    fileName: string,
    mimeType: string,
    title: string,
    category: DocumentCategory,
    assignedTo: AssignedTo[],
    onProgress: (p: UploadProgress) => void,
  ): void {
    const householdId = this.household.householdId();
    const user = this.auth.user();
    if (!householdId || !user) {
      onProgress({ percent: 0, done: true, error: 'Ikke innlogget eller ingen husstand.' });
      return;
    }

    const docId = crypto.randomUUID();
    const storagePath = `households/${householdId}/documents/${docId}`;
    const storageRef = ref(firebaseStorage, storagePath);

    const task = uploadBytesResumable(storageRef, file, { contentType: mimeType });

    task.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress({ percent, done: false });
      },
      (err) => {
        onProgress({ percent: 0, done: true, error: 'Opplasting feilet: ' + err.message });
      },
      async () => {
        try {
          const fileUrl = await getDownloadURL(task.snapshot.ref);
          const archiveDoc: ArchiveDocument = {
            id: docId,
            title,
            category,
            assignedTo,
            uploadedBy: user.uid,
            uploadedByName: user.displayName ?? user.email ?? 'Ukjent',
            uploadedAt: new Date().toISOString(),
            fileUrl,
            storagePath,
            mimeType,
            fileSizeBytes: file.size,
          };
          await setDoc(doc(db, `households/${householdId}/documents/${docId}`), archiveDoc);
          onProgress({ percent: 100, done: true, document: archiveDoc });
          this.notifyUpload(householdId, title, archiveDoc.uploadedByName);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Ukjent feil';
          onProgress({ percent: 100, done: true, error: 'Kunne ikke lagre metadata: ' + msg });
        }
      },
    );
  }

  async updateDocument(
    id: string,
    changes: { title: string; category: DocumentCategory; assignedTo: AssignedTo[] },
  ): Promise<void> {
    const householdId = this.household.householdId();
    if (!householdId) return;
    await updateDoc(doc(db, `households/${householdId}/documents/${id}`), changes);
  }

  async deleteDocument(document: ArchiveDocument): Promise<void> {
    const householdId = this.household.householdId();
    if (!householdId) return;
    const storageRef = ref(firebaseStorage, document.storagePath);
    await Promise.all([
      deleteObject(storageRef).catch(() => {}),
      deleteDoc(doc(db, `households/${householdId}/documents/${document.id}`)),
    ]);
  }

  private notifyUpload(householdId: string, documentTitle: string, uploaderName: string): void {
    firstValueFrom(
      this.http.post('/api/dokumenter/notify-upload', { householdId, documentTitle, uploaderName }),
    ).catch(() => {});
  }
}

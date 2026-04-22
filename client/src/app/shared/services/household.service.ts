import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { firebaseDb as db } from '../../core/firebase';

export interface HouseholdMember {
  uid: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
}

@Injectable({ providedIn: 'root' })
export class HouseholdService {
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private unsub: Unsubscribe | null = null;

  readonly householdId = signal<string | null>(null);
  readonly inviteCode = signal<string | null>(null);
  readonly members = signal<HouseholdMember[]>([]);

  /** True når husstands-ID er bestemt og onSnapshot er satt opp */
  readonly ready = signal(false);

  readonly isAdmin = computed(() => {
    const uid = this.auth.user()?.uid;
    if (!uid) return false;
    return this.members().some((m) => m.uid === uid && m.role === 'admin');
  });

  constructor() {
    const check = setInterval(() => {
      if (!this.auth.loading()) {
        clearInterval(check);
        if (this.auth.isLoggedIn()) {
          this.init();
        } else {
          this.ready.set(true);
        }
      }
    }, 50);

    this.destroyRef.onDestroy(() => this.unsub?.());
  }

  // ── Init ──────────────────────────────────────────────────

  private async init(): Promise<void> {
    const uid = this.auth.user()!.uid;
    const userSnap = await getDoc(doc(db, 'users', uid));
    const userData = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : null;
    let hid = userData?.['householdId'] as string | undefined;

    if (!hid) {
      hid = await this.createHousehold(userData);
    }

    this.householdId.set(hid);
    this.subscribeToHousehold(hid);
  }

  private async createHousehold(existingUserData: Record<string, unknown> | null): Promise<string> {
    const user = this.auth.user()!;
    const hid = crypto.randomUUID();
    const code = this.generateCode();

    const me: HouseholdMember = {
      uid: user.uid,
      displayName: user.displayName ?? user.email ?? 'Ukjent',
      photoURL: user.photoURL,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    };

    // Grunnleggende husstand-dokument
    const householdDoc: Record<string, unknown> = {
      inviteCode: code,
      members: [me],
      memberUids: [user.uid],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Migrer eksisterende familie-data fra users/{uid} om det finnes
    if (existingUserData?.['children']) {
      Object.assign(householdDoc, {
        children: existingUserData['children'],
        activeChildId: existingUserData['activeChildId'] ?? null,
        householdLabel: existingUserData['householdLabel'] ?? null,
        plans: existingUserData['plans'] ?? {},
        baseRotation: existingUserData['baseRotation'] ?? null,
        residencyOverrides: existingUserData['residencyOverrides'] ?? {},
        activeWeek: existingUserData['activeWeek'] ?? null,
      });
    }

    await setDoc(doc(db, 'households', hid), householdDoc);
    await setDoc(doc(db, 'inviteCodes', code), { householdId: hid });
    await setDoc(doc(db, 'users', user.uid), { householdId: hid }, { merge: true });

    return hid;
  }

  // ── Join ─────────────────────────────────────────────────

  async joinHousehold(code: string): Promise<void> {
    const normalized = code.trim().toUpperCase();
    const codeSnap = await getDoc(doc(db, 'inviteCodes', normalized));

    if (!codeSnap.exists()) {
      throw new Error('Ugyldig kode. Sjekk at du har tastet riktig.');
    }

    const hid = (codeSnap.data() as { householdId: string }).householdId;

    if (hid === this.householdId()) {
      throw new Error('Du er allerede med i denne husstanden.');
    }

    const user = this.auth.user()!;

    const me: HouseholdMember = {
      uid: user.uid,
      displayName: user.displayName ?? user.email ?? 'Ukjent',
      photoURL: user.photoURL,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };

    await updateDoc(doc(db, 'households', hid), {
      members: arrayUnion(me),
      memberUids: arrayUnion(user.uid),
    });
    await setDoc(doc(db, 'users', user.uid), { householdId: hid }, { merge: true });

    this.unsub?.();
    this.householdId.set(hid);
    this.subscribeToHousehold(hid);
  }

  // ── Member management ─────────────────────────────────────

  async removeMember(uid: string): Promise<void> {
    const hid = this.householdId();
    if (!hid) return;
    const updatedMembers = this.members().filter((m) => m.uid !== uid);
    await updateDoc(doc(db, 'households', hid), {
      members: updatedMembers,
      memberUids: updatedMembers.map((m) => m.uid),
    });
  }

  async promoteMember(uid: string): Promise<void> {
    const hid = this.householdId();
    if (!hid) return;
    const updatedMembers = this.members().map((m) =>
      m.uid === uid ? { ...m, role: 'admin' as const } : m
    );
    await updateDoc(doc(db, 'households', hid), { members: updatedMembers });
  }

  // ── Internal ──────────────────────────────────────────────

  private subscribeToHousehold(hid: string): void {
    this.unsub?.();
    this.ready.set(false);
    this.unsub = onSnapshot(doc(db, 'households', hid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { inviteCode?: string; members?: HouseholdMember[] };
        this.inviteCode.set(data.inviteCode ?? null);
        this.members.set(data.members ?? []);
      }
      this.ready.set(true);
    });
  }

  /** Genererer 6-tegns kode uten tvetydige tegn (0/O, 1/I/l) */
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }
}

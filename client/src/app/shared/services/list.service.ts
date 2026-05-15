import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { HouseholdService } from './household.service';
import { firebaseDb as db } from '../../core/firebase';
import { AssignedTo } from '../../features/school-plan/models/school-plan.models';

export type { AssignedTo };

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo?: AssignedTo[];
}

export interface AppList {
  id: string;
  type: 'bytte-hus' | 'handleliste' | 'pakkeliste';
  title: string;
  items: ListItem[];
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class ListService {
  private auth = inject(AuthService);
  private household = inject(HouseholdService);
  private destroyRef = inject(DestroyRef);
  private unsub: Unsubscribe | null = null;

  readonly lists = signal<AppList[]>([]);

  constructor() {
    const checkAuth = setInterval(() => {
      if (!this.auth.loading() && this.household.ready()) {
        clearInterval(checkAuth);
        if (this.auth.isLoggedIn()) {
          this.subscribeToLists();
        }
      }
    }, 50);

    this.destroyRef.onDestroy(() => this.unsub?.());
  }

  private get householdId(): string {
    return this.household.householdId()!;
  }

  private get listsRef() {
    return collection(db, 'households', this.householdId, 'lists');
  }

  private listDocRef(listId: string) {
    return doc(db, 'households', this.householdId, 'lists', listId);
  }

  private subscribeToLists(): void {
    this.unsub = onSnapshot(
      this.listsRef,
      async (snapshot) => {
        const docs = snapshot.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<AppList, 'id'>) } as AppList)
        );
        this.lists.set(docs);

        // Ensure singletons exist — create only once per snapshot if missing
        const hasBytteHus = docs.some((l) => l.type === 'bytte-hus');
        const hasHandleliste = docs.some((l) => l.type === 'handleliste');
        try {
          if (!hasBytteHus) await this.createSingleton('bytte-hus', 'Bytte hus');
          if (!hasHandleliste) await this.createSingleton('handleliste', 'Ting vi mangler');
        } catch (err) {
          console.error('[ListService] createSingleton failed:', err);
        }
      },
      (err) => console.error('[ListService]', err.message),
    );
  }

  private async createSingleton(
    type: 'bytte-hus' | 'handleliste',
    title: string
  ): Promise<void> {
    // Use type as doc ID so it's idempotent across concurrent tabs
    const newDoc = doc(this.listsRef, type);
    await setDoc(
      newDoc,
      { type, title, items: [], updatedAt: Date.now() },
      { merge: true }
    );
  }

  async createPakkeliste(title: string): Promise<string> {
    const newDoc = doc(this.listsRef);
    await setDoc(newDoc, {
      type: 'pakkeliste',
      title,
      items: [],
      updatedAt: Date.now(),
    });
    return newDoc.id;
  }

  async toggleItem(listId: string, itemId: string, completed: boolean): Promise<void> {
    const list = this.lists().find((l) => l.id === listId);
    if (!list) return;
    const updatedItems = list.items.map((item) =>
      item.id === itemId ? { ...item, completed } : item
    );
    await updateDoc(this.listDocRef(listId), {
      items: updatedItems,
      updatedAt: Date.now(),
    });
  }

  async addItem(listId: string, text: string, assignedTo?: AssignedTo[]): Promise<void> {
    const list = this.lists().find((l) => l.id === listId);
    if (!list) return;
    const newItem: ListItem = { id: crypto.randomUUID(), text, completed: false };
    if (assignedTo?.length) newItem.assignedTo = assignedTo;
    await updateDoc(this.listDocRef(listId), {
      items: [...list.items, newItem],
      updatedAt: Date.now(),
    });
  }

  async updateItemTags(listId: string, itemId: string, assignedTo: AssignedTo[]): Promise<void> {
    const list = this.lists().find((l) => l.id === listId);
    if (!list) return;
    const updatedItems = list.items.map((item) =>
      item.id === itemId ? { ...item, assignedTo } : item
    );
    await updateDoc(this.listDocRef(listId), { items: updatedItems, updatedAt: Date.now() });
  }

  async deleteItem(listId: string, itemId: string): Promise<void> {
    const list = this.lists().find((l) => l.id === listId);
    if (!list) return;
    const updatedItems = list.items.filter((item) => item.id !== itemId);
    await updateDoc(this.listDocRef(listId), {
      items: updatedItems,
      updatedAt: Date.now(),
    });
  }

  async resetList(listId: string): Promise<void> {
    const list = this.lists().find((l) => l.id === listId);
    if (!list) return;
    const resetItems = list.items.map((item) => ({ ...item, completed: false }));
    await updateDoc(this.listDocRef(listId), {
      items: resetItems,
      updatedAt: Date.now(),
    });
  }

  async deleteList(listId: string): Promise<void> {
    const list = this.lists().find((l) => l.id === listId);
    if (!list || list.type !== 'pakkeliste') return;
    await deleteDoc(this.listDocRef(listId));
  }
}

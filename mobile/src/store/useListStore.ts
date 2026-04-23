import { create } from 'zustand';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export type ListType = 'bytte-hus' | 'handleliste' | 'pakkeliste';

export interface ShoppingList {
  id: string;
  title: string;
  type: ListType;
  items: ListItem[];
  createdAt: string;
}

interface ListStore {
  lists: ShoppingList[];
  isLoading: boolean;
  householdId: string | null;

  listenToLists: (householdId: string) => () => void;
  addList: (title: string, type: 'pakkeliste') => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  addItem: (listId: string, text: string) => Promise<void>;
  deleteItem: (listId: string, itemId: string) => Promise<void>;
  toggleItemStatus: (listId: string, itemId: string, completed: boolean) => Promise<void>;
  resetList: (listId: string) => Promise<void>;
  removeCompletedItems: (listId: string) => Promise<void>;
  reset: () => void;
}

const DEFAULT_LISTS: Array<{ title: string; type: ListType }> = [
  { title: 'Bytte hus', type: 'bytte-hus' },
  { title: 'Handleliste', type: 'handleliste' },
];

const TYPE_ORDER: Record<ListType, number> = {
  'bytte-hus': 0,
  handleliste: 1,
  pakkeliste: 2,
};

const newId = () =>
  Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const INITIAL_STATE = { lists: [], isLoading: true, householdId: null };

export const useListStore = create<ListStore>((set, get) => ({
  ...INITIAL_STATE,

  listenToLists: (householdId: string) => {
    set({ householdId, isLoading: true });

    const colRef = collection(db, 'households', householdId, 'lists');
    let defaultsChecked = false;

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        const lists: ShoppingList[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ShoppingList, 'id'>),
        }));

        lists.sort((a, b) => {
          const diff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
          if (diff !== 0) return diff;
          return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
        });

        set({ lists, isLoading: false });

        // Auto-create missing fixed lists on first snapshot
        if (!defaultsChecked) {
          defaultsChecked = true;
          const existingTypes = new Set(lists.map((l) => l.type));
          for (const def of DEFAULT_LISTS) {
            if (!existingTypes.has(def.type)) {
              await addDoc(colRef, {
                title: def.title,
                type: def.type,
                items: [],
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      },
      () => set({ isLoading: false }),
    );

    return unsubscribe;
  },

  addList: async (title, type = 'pakkeliste') => {
    const { householdId } = get();
    if (!householdId) return;
    await addDoc(collection(db, 'households', householdId, 'lists'), {
      title,
      type,
      items: [],
      createdAt: new Date().toISOString(),
    });
  },

  deleteList: async (listId) => {
    const { householdId } = get();
    if (!householdId) return;
    await deleteDoc(doc(db, 'households', householdId, 'lists', listId));
  },

  addItem: async (listId, text) => {
    const { householdId, lists } = get();
    if (!householdId) return;
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const newItem: ListItem = {
      id: newId(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, 'households', householdId, 'lists', listId), {
      items: [...list.items, newItem],
    });
  },

  deleteItem: async (listId, itemId) => {
    const { householdId, lists } = get();
    if (!householdId) return;
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    await updateDoc(doc(db, 'households', householdId, 'lists', listId), {
      items: list.items.filter((i) => i.id !== itemId),
    });
  },

  toggleItemStatus: async (listId, itemId, completed) => {
    const { householdId, lists } = get();
    if (!householdId) return;
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    await updateDoc(doc(db, 'households', householdId, 'lists', listId), {
      items: list.items.map((i) =>
        i.id === itemId ? { ...i, completed } : i,
      ),
    });
  },

  resetList: async (listId) => {
    const { householdId, lists } = get();
    if (!householdId) return;
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    await updateDoc(doc(db, 'households', householdId, 'lists', listId), {
      items: list.items.map((i) => ({ ...i, completed: false })),
    });
  },

  removeCompletedItems: async (listId) => {
    const { householdId, lists } = get();
    if (!householdId) return;
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    await updateDoc(doc(db, 'households', householdId, 'lists', listId), {
      items: list.items.filter((i) => !i.completed),
    });
  },

  reset: () => set({ ...INITIAL_STATE, isLoading: false }),
}));

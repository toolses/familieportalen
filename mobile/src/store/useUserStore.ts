import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserDocument } from '../types/family.types';

interface UserStore {
  userData: UserDocument | null;
  householdId: string | null;
  isLoading: boolean;
  listenToUserDocument: (uid: string) => () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  userData: null,
  householdId: null,
  isLoading: true,
};

export const useUserStore = create<UserStore>((set) => ({
  ...INITIAL_STATE,

  listenToUserDocument: (uid: string) => {
    set({ isLoading: true });

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserDocument;
          set({
            userData: data,
            householdId: data.householdId ?? null,
            isLoading: false,
          });
        } else {
          set({ userData: null, householdId: null, isLoading: false });
        }
      },
      () => set({ isLoading: false }),
    );

    return unsubscribe;
  },

  reset: () => set({ ...INITIAL_STATE, isLoading: false }),
}));

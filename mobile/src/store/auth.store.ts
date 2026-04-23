import { create } from 'zustand';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  init: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: () =>
    onAuthStateChanged(auth, (user) => set({ user, loading: false })),

  signOut: () => firebaseSignOut(auth),
}));

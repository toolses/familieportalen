import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA_Bnd9r48jSrXDZE1e2I5wEqXlOt1RBDg',
  authDomain: 'familieportalen-11d5e.firebaseapp.com',
  projectId: 'familieportalen-11d5e',
  storageBucket: 'familieportalen-11d5e.firebasestorage.app',
  messagingSenderId: '745029363713',
  appId: '1:745029363713:web:06c83c8f351e5d69077800',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

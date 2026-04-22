import { Injectable, signal, computed } from '@angular/core';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '../../core/firebase';

const auth = firebaseAuth;

const ADMIN_UIDS = new Set(['Ou7ByiLJlcRUqYGSkiMDGzrYyJQ2']);

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly isLoggedIn = computed(() => !!this.user());
  readonly isAdmin = computed(() => ADMIN_UIDS.has(this.user()?.uid ?? ''));
  readonly displayName = computed(() => this.user()?.displayName ?? null);
  readonly photoURL = computed(() => this.user()?.photoURL ?? null);

  // Kept for backwards compat — no longer used for calendar
  readonly hasGoogleToken = computed(() => false);

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
      this.loading.set(false);
    });
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  async getIdToken(): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }

  /** @deprecated No longer used — calendar uses backend token */
  getGoogleAccessToken(): string | null { return null; }

  /** @deprecated No longer used — calendar uses backend token */
  async refreshGoogleAccessToken(): Promise<string | null> { return null; }
}

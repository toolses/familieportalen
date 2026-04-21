import { Injectable, signal, computed } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  type User,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

const firebaseApp = initializeApp(environment.firebase);
const auth = getAuth(firebaseApp);

const GOOGLE_TOKEN_KEY = 'fp_google_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly isLoggedIn = computed(() => !!this.user());
  readonly displayName = computed(() => this.user()?.displayName ?? null);
  readonly photoURL = computed(() => this.user()?.photoURL ?? null);

  private googleAccessToken = signal<string | null>(null);
  readonly hasGoogleToken = computed(() => !!this.googleAccessToken());

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
      this.loading.set(false);
      if (user) {
        // Restore token from sessionStorage after page refresh
        const stored = sessionStorage.getItem(GOOGLE_TOKEN_KEY);
        if (stored) this.googleAccessToken.set(stored);
      } else {
        this.googleAccessToken.set(null);
        sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
      }
    });
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      this.googleAccessToken.set(credential.accessToken);
      sessionStorage.setItem(GOOGLE_TOKEN_KEY, credential.accessToken);
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
    this.googleAccessToken.set(null);
    sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
  }

  async getIdToken(): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }

  getGoogleAccessToken(): string | null {
    return this.googleAccessToken();
  }

  /** Re-authenticate to get a fresh Google access token (they expire after ~1h) */
  async refreshGoogleAccessToken(): Promise<string | null> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      this.googleAccessToken.set(credential.accessToken);
      sessionStorage.setItem(GOOGLE_TOKEN_KEY, credential.accessToken);
      return credential.accessToken;
    }
    return null;
  }
}

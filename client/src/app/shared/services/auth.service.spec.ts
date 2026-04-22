import { vi, describe, it, expect, beforeEach } from 'vitest';

// Firebase-modulene mockes FØR de importeres av AuthService
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
    cb(null);
    return () => {};
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
  OAuthProvider: class {},
}));

// core/firebase.ts kaller initializeFirestore fra firebase/firestore — mock
// for å unngå at reell Firebase-initialisering kjøres i testmiljøet.
vi.mock('../../core/firebase', () => ({
  firebaseApp: {},
  firebaseAuth: {},
  firebaseDb: {},
}));

import { AuthService } from './auth.service';
import type { User } from 'firebase/auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  describe('isLoggedIn', () => {
    it('er false når ingen bruker er innlogget', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('er true når bruker er satt', () => {
      service.user.set({ uid: 'some-uid' } as User);
      expect(service.isLoggedIn()).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('er false for uinnlogget bruker', () => {
      expect(service.isAdmin()).toBe(false);
    });

    it('er true for admin-UID', () => {
      service.user.set({ uid: 'Ou7ByiLJlcRUqYGSkiMDGzrYyJQ2' } as User);
      expect(service.isAdmin()).toBe(true);
    });

    it('er false for vanlig bruker-UID', () => {
      service.user.set({ uid: 'annen-bruker-uid-123' } as User);
      expect(service.isAdmin()).toBe(false);
    });

    it('er false når user er null', () => {
      service.user.set(null);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('loading', () => {
    it('er false etter at onAuthStateChanged har kalt callback', () => {
      // Mocked onAuthStateChanged kalte cb(null) umiddelbart ved oppstart
      expect(service.loading()).toBe(false);
    });
  });

  describe('displayName / photoURL', () => {
    it('returnerer null når ingen bruker er innlogget', () => {
      expect(service.displayName()).toBeNull();
      expect(service.photoURL()).toBeNull();
    });

    it('returnerer displayName og photoURL fra bruker-objektet', () => {
      service.user.set({ uid: 'x', displayName: 'Ola Nordmann', photoURL: 'https://example.com/photo.jpg' } as User);
      expect(service.displayName()).toBe('Ola Nordmann');
      expect(service.photoURL()).toBe('https://example.com/photo.jpg');
    });
  });
});

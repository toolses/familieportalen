import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Firebase-modulene mockes FØR de importeres av HouseholdService
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_: unknown, cb: (u: null) => void) => {
    cb(null);
    return () => {};
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({ path: parts.join('/') })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  onSnapshot: vi.fn(() => () => {}),
  arrayUnion: vi.fn((...args: unknown[]) => args),
}));

vi.mock('../../core/firebase', () => ({
  firebaseApp: {},
  firebaseAuth: {},
  firebaseDb: {},
}));

import { TestBed } from '@angular/core/testing';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { signal } from '@angular/core';
import { updateDoc } from 'firebase/firestore';
import { HouseholdService, type HouseholdMember } from './household.service';
import { AuthService } from './auth.service';

// ── Hjelpefunksjon ───────────────────────────────────────────

const makeMember = (uid: string, parentRole: 'Mamma' | 'Pappa' | null, role: 'admin' | 'member' = 'member'): HouseholdMember => ({
  uid,
  displayName: uid,
  photoURL: null,
  role,
  parentRole,
  joinedAt: '2025-01-01T00:00:00.000Z',
});

// ── Tester ────────────────────────────────────────────────────

describe('HouseholdService', () => {
  setupTestBed();
  let service: HouseholdService;

  const mockAuthService = {
    loading: signal(false),
    isLoggedIn: () => false,
    user: signal(null),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        HouseholdService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(HouseholdService);
    vi.runAllTimers(); // Kjør setInterval i konstruktøren (setter ready=true, kaller ikke init)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── mammaMember ───────────────────────────────────────────

  describe('mammaMember', () => {
    it('er null når ingen har Mamma-rolle', () => {
      service.members.set([makeMember('u1', null), makeMember('u2', 'Pappa')]);
      expect(service.mammaMember()).toBeNull();
    });

    it('returnerer riktig medlem med Mamma-rolle', () => {
      service.members.set([makeMember('u1', 'Mamma'), makeMember('u2', null)]);
      expect(service.mammaMember()?.uid).toBe('u1');
    });

    it('er null for tom liste', () => {
      service.members.set([]);
      expect(service.mammaMember()).toBeNull();
    });
  });

  // ── pappaMember ───────────────────────────────────────────

  describe('pappaMember', () => {
    it('er null når ingen har Pappa-rolle', () => {
      service.members.set([makeMember('u1', 'Mamma'), makeMember('u2', null)]);
      expect(service.pappaMember()).toBeNull();
    });

    it('returnerer riktig medlem med Pappa-rolle', () => {
      service.members.set([makeMember('u1', null), makeMember('u2', 'Pappa')]);
      expect(service.pappaMember()?.uid).toBe('u2');
    });

    it('er null for tom liste', () => {
      service.members.set([]);
      expect(service.pappaMember()).toBeNull();
    });
  });

  // ── setMemberParentRole ───────────────────────────────────

  describe('setMemberParentRole', () => {
    it('gjør ingenting og kaller ikke Firestore når householdId er null', async () => {
      service.householdId.set(null);
      await service.setMemberParentRole('u1', 'Mamma');
      expect(vi.mocked(updateDoc)).not.toHaveBeenCalled();
    });

    it('kaller updateDoc én gang med oppdatert members-array', async () => {
      service.householdId.set('hid-123');
      service.members.set([makeMember('u1', null), makeMember('u2', null)]);
      await service.setMemberParentRole('u1', 'Mamma');
      expect(vi.mocked(updateDoc)).toHaveBeenCalledOnce();
    });

    it('setter rollen på riktig medlem', async () => {
      service.householdId.set('hid-123');
      service.members.set([makeMember('u1', null), makeMember('u2', null)]);
      await service.setMemberParentRole('u1', 'Mamma');
      const { members } = vi.mocked(updateDoc).mock.calls[0][1] as { members: HouseholdMember[] };
      expect(members.find((m) => m.uid === 'u1')?.parentRole).toBe('Mamma');
    });

    it('fjerner samme rolle fra andre medlemmer', async () => {
      service.householdId.set('hid-123');
      service.members.set([makeMember('u1', 'Mamma'), makeMember('u2', null)]);
      await service.setMemberParentRole('u2', 'Mamma');
      const { members } = vi.mocked(updateDoc).mock.calls[0][1] as { members: HouseholdMember[] };
      expect(members.find((m) => m.uid === 'u1')?.parentRole).toBeNull();
      expect(members.find((m) => m.uid === 'u2')?.parentRole).toBe('Mamma');
    });

    it('sletter rollen (null) uten å endre andre', async () => {
      service.householdId.set('hid-123');
      service.members.set([makeMember('u1', 'Mamma'), makeMember('u2', 'Pappa')]);
      await service.setMemberParentRole('u1', null);
      const { members } = vi.mocked(updateDoc).mock.calls[0][1] as { members: HouseholdMember[] };
      expect(members.find((m) => m.uid === 'u1')?.parentRole).toBeNull();
      // u2 sin Pappa-rolle skal ikke berøres
      expect(members.find((m) => m.uid === 'u2')?.parentRole).toBe('Pappa');
    });
  });
});

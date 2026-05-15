import { vi, describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_: unknown, cb: (u: null) => void) => { cb(null); return () => {}; }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
  OAuthProvider: class {},
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteField: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
}));
vi.mock('../../core/firebase', () => ({
  firebaseApp: {},
  firebaseAuth: {},
  firebaseDb: {},
}));

import { ResidencyService } from './residency.service';
import type { BaseRotation, ResidencyOverrides } from '../../features/school-plan/models/school-plan.models';

// Startpunkt for rotasjonstestene: mandag 6. april 2026, Mamma starter.
// Slot-grenser: slot 0 = 6.–19. apr (Mamma), slot 1 = 20. apr–3. mai (Pappa),
//               slot 2 = 4.–17. mai (Mamma), slot -1 = 23. mar–5. apr (Pappa).
const START_DATE = '2026-04-06';
const BASE_ROTATION: BaseRotation = { startDate: START_DATE, startLabel: 'Mamma' };

function makeContext(
  overrides: ResidencyOverrides = {},
  rotation: BaseRotation | null = BASE_ROTATION,
  householdLabel: 'Mamma' | 'Pappa' | null = null,
) {
  return {
    data: {
      residencyOverrides: signal(overrides),
      baseRotation: signal(rotation),
      householdLabel: signal(householdLabel),
    },
  } as unknown as ResidencyService;
}

const residencyForDate = (ctx: ResidencyService, date: string) =>
  ResidencyService.prototype.residencyForDate.call(ctx, date);

describe('ResidencyService – residencyForDate', () => {
  describe('overrides', () => {
    it('overstyring slår alltid igjennom for gitt dato', () => {
      const ctx = makeContext({ '2026-04-06': 'Pappa' });
      expect(residencyForDate(ctx, '2026-04-06')).toBe('Pappa');
    });

    it('overstyring påvirker ikke andre datoer', () => {
      const ctx = makeContext({ '2026-04-06': 'Pappa' });
      expect(residencyForDate(ctx, '2026-04-07')).toBe('Mamma');
    });

    it('uten rotasjon og med overstyring returneres overstyringen', () => {
      const ctx = makeContext({ '2026-04-06': 'Mamma' }, null, 'Pappa');
      expect(residencyForDate(ctx, '2026-04-06')).toBe('Mamma');
    });
  });

  describe('uten rotasjon', () => {
    it('returnerer householdLabel når ingen rotasjon er satt', () => {
      const ctx = makeContext({}, null, 'Mamma');
      expect(residencyForDate(ctx, '2026-04-06')).toBe('Mamma');
    });

    it('returnerer null når hverken rotasjon eller householdLabel er satt', () => {
      const ctx = makeContext({}, null, null);
      expect(residencyForDate(ctx, '2026-04-06')).toBeNull();
    });
  });

  describe('rotasjonsberegning – slot 0 (Mamma)', () => {
    it('første dag i rotasjonen tilhører Mamma', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-04-06')).toBe('Mamma');
    });

    it('siste dag i slot 0 (dag 13) tilhører fortsatt Mamma', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-04-19')).toBe('Mamma');
    });
  });

  describe('rotasjonsberegning – slot 1 (Pappa)', () => {
    it('første dag i slot 1 (dag 14) bytter til Pappa', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-04-20')).toBe('Pappa');
    });

    it('midten av slot 1 tilhører Pappa', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-04-27')).toBe('Pappa');
    });

    it('siste dag i slot 1 (dag 27) tilhører fortsatt Pappa', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-05-03')).toBe('Pappa');
    });
  });

  describe('rotasjonsberegning – slot 2 (Mamma igjen)', () => {
    it('første dag i slot 2 (dag 28) bytter tilbake til Mamma', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-05-04')).toBe('Mamma');
    });
  });

  describe('rotasjonsberegning – slot -1 (før startdato)', () => {
    it('dagen før startdato tilhører Pappa (slot -1 er odde)', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-04-05')).toBe('Pappa');
    });

    it('14 dager før startdato tilhører Pappa (slot -1)', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-03-23')).toBe('Pappa');
    });

    it('15 dager før startdato tilhører Mamma (slot -2 er jevn)', () => {
      const ctx = makeContext();
      expect(residencyForDate(ctx, '2026-03-22')).toBe('Mamma');
    });
  });

  describe('rotasjon med Pappa som startlabel', () => {
    const pappaFirst: BaseRotation = { startDate: START_DATE, startLabel: 'Pappa' };

    it('slot 0 gir Pappa', () => {
      const ctx = makeContext({}, pappaFirst);
      expect(residencyForDate(ctx, '2026-04-06')).toBe('Pappa');
    });

    it('slot 1 gir Mamma', () => {
      const ctx = makeContext({}, pappaFirst);
      expect(residencyForDate(ctx, '2026-04-20')).toBe('Mamma');
    });
  });
});

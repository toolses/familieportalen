import '@angular/compiler'; // Nødvendig for JIT-kompilering av FormsModule under import
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Firebase-modulene mockes FØR de importeres transitiv via ResidencyPlannerComponent
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

import { signal } from '@angular/core';
import { ResidencyPlannerComponent } from './residency-planner.component';
import type { ResidencyOverrides } from '../school-plan/models/school-plan.models';

describe('ResidencyPlannerComponent – toggleCell', () => {
  const overridesSignal = signal<ResidencyOverrides>({});
  const setResidencyOverride = vi.fn();

  /**
   * Minimalt "this"-objekt med bare det toggleCell trenger.
   * Vi bruker prototype.call for å unngå Angular DI-oppsett.
   */
  const mockContext = {
    data: {
      residencyOverrides: overridesSignal,
      setResidencyOverride,
    },
  } as unknown as ResidencyPlannerComponent;

  const toggleCell = (dateStr: string, residency: 'Mamma' | 'Pappa' | null) =>
    ResidencyPlannerComponent.prototype.toggleCell.call(mockContext, dateStr, residency);

  beforeEach(() => {
    vi.clearAllMocks();
    overridesSignal.set({});
  });

  it('kaller setResidencyOverride med null når datoen allerede er overstyrt', () => {
    overridesSignal.set({ '2026-04-22': 'Mamma' });
    toggleCell('2026-04-22', 'Mamma');
    expect(setResidencyOverride).toHaveBeenCalledWith('2026-04-22', null);
  });

  it('setter Pappa-overstyring når datoen ikke er overstyrt og nåværende er Mamma', () => {
    toggleCell('2026-04-22', 'Mamma');
    expect(setResidencyOverride).toHaveBeenCalledWith('2026-04-22', 'Pappa');
  });

  it('setter Mamma-overstyring når datoen ikke er overstyrt og nåværende er Pappa', () => {
    toggleCell('2026-04-22', 'Pappa');
    expect(setResidencyOverride).toHaveBeenCalledWith('2026-04-22', 'Mamma');
  });

  it('setter Mamma-overstyring når datoen ikke er overstyrt og nåværende er null', () => {
    toggleCell('2026-04-22', null);
    expect(setResidencyOverride).toHaveBeenCalledWith('2026-04-22', 'Mamma');
  });

  it('kaller setResidencyOverride nøyaktig én gang per klikk', () => {
    toggleCell('2026-04-22', 'Pappa');
    expect(setResidencyOverride).toHaveBeenCalledOnce();
  });
});

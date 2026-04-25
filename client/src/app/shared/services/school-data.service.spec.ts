import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// vi.hoisted kjøres FØR vi.mock-fabrikker (som blir hoistet) — variabler
// her er tilgjengelige inne i vi.mock-blokkene under.
const { mockUpdateDoc, mockDeleteField, mockDeleteFieldSentinel } = vi.hoisted(() => {
  const mockDeleteFieldSentinel = { _methodName: 'deleteField' };
  return {
    mockDeleteFieldSentinel,
    mockDeleteField: vi.fn(() => mockDeleteFieldSentinel),
    mockUpdateDoc: vi.fn(() => Promise.resolve(undefined)),
  };
});

// Firebase-modulene mockes FØR de importeres av SchoolDataService
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
  updateDoc: mockUpdateDoc,
  deleteField: mockDeleteField,
  onSnapshot: vi.fn(() => () => {}),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
}));

vi.mock('../../core/firebase', () => ({
  firebaseApp: {},
  firebaseAuth: {},
  firebaseDb: {},
}));

import { signal, Injector, DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { SchoolDataService } from './school-data.service';
import { AuthService } from './auth.service';
import { HouseholdService } from './household.service';

const mockHouseholdId = signal<string | null>('test-household-id');

const mockAuthService = {
  user: signal(null),
  isLoggedIn: signal(false),
  loading: signal(false),
};

const mockHouseholdService = {
  householdId: mockHouseholdId,
  ready: signal(true),
};

describe('SchoolDataService – setResidencyOverride', () => {
  let service: SchoolDataService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockHouseholdId.set('test-household-id');

    // Injector.create unngår TestBed.configureTestingModule som er buggy
    // med providedIn: 'root' i Angular 21 sitt testmiljø.
    const injector = Injector.create({
      providers: [
        SchoolDataService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: DestroyRef, useValue: { onDestroy: vi.fn() } },
      ],
    });
    service = injector.get(SchoolDataService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('signal-oppdatering', () => {
    it('legger til en dato-overstyring i signalet', () => {
      service.setResidencyOverride('2026-04-22', 'Mamma');
      expect(service.residencyOverrides()['2026-04-22']).toBe('Mamma');
    });

    it('fjerner dato-overstyringen fra signalet når label er null', () => {
      service.setResidencyOverride('2026-04-22', 'Mamma');
      service.setResidencyOverride('2026-04-22', null);
      expect('2026-04-22' in service.residencyOverrides()).toBe(false);
    });

    it('beholder andre overstyringer når én dato fjernes', () => {
      service.setResidencyOverride('2026-04-22', 'Mamma');
      service.setResidencyOverride('2026-04-23', 'Pappa');
      service.setResidencyOverride('2026-04-22', null);
      const ov = service.residencyOverrides();
      expect('2026-04-22' in ov).toBe(false);
      expect(ov['2026-04-23']).toBe('Pappa');
    });
  });

  describe('Firestore-skriving', () => {
    it('kaller updateDoc med korrekt feltsti og label ved ny overstyring', () => {
      service.setResidencyOverride('2026-04-22', 'Pappa');
      expect(mockUpdateDoc).toHaveBeenCalledOnce();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { 'residencyOverrides.2026-04-22': 'Pappa' },
      );
    });

    it('kaller updateDoc med deleteField()-sentinel ved fjerning av overstyring', () => {
      service.setResidencyOverride('2026-04-22', null);
      expect(mockUpdateDoc).toHaveBeenCalledOnce();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { 'residencyOverrides.2026-04-22': mockDeleteFieldSentinel },
      );
    });

    it('kaller ikke updateDoc når householdId er null', () => {
      mockHouseholdId.set(null);
      service.setResidencyOverride('2026-04-22', 'Mamma');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });
});

// ── Hjelpe-fabrikker ──────────────────────────────────────────
import type { ManualReminder, ManualCalendarEvent } from '../../features/school-plan/models/school-plan.models';

const minReminder = (overrides: Partial<Omit<ManualReminder, 'id' | 'createdAt'>> = {}): Omit<ManualReminder, 'id' | 'createdAt'> => ({
  title: 'Testpåminnelse',
  description: '',
  date: '2025-06-02',
  time: null,
  isSchoolRelated: false,
  assignedTo: [{ type: 'parent', role: 'Mamma' }],
  recurrence: null,
  ...overrides,
});

const minCalEvent = (overrides: Partial<Omit<ManualCalendarEvent, 'id' | 'createdAt'>> = {}): Omit<ManualCalendarEvent, 'id' | 'createdAt'> => ({
  title: 'Testhendelse',
  description: '',
  startDate: '2025-06-02',
  endDate: '2025-06-02',
  startTime: null,
  endTime: null,
  isAllDay: true,
  assignedTo: [{ type: 'parent', role: 'Pappa' }],
  recurrence: null,
  ...overrides,
});

describe('SchoolDataService – manualReminders', () => {
  setupTestBed();
  let service: SchoolDataService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockHouseholdId.set(null); // ingen Firestore-skriving

    TestBed.configureTestingModule({
      providers: [
        SchoolDataService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
      ],
    });

    service = TestBed.inject(SchoolDataService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addManualReminder', () => {
    it('starter med tomt signal', () => {
      expect(service.manualReminders()).toEqual([]);
    });

    it('legger til påminnelse i signalet', () => {
      service.addManualReminder(minReminder({ title: 'Huskelapp' }));
      expect(service.manualReminders().length).toBe(1);
      expect(service.manualReminders()[0].title).toBe('Huskelapp');
    });

    it('genererer id og createdAt automatisk', () => {
      service.addManualReminder(minReminder());
      const r = service.manualReminders()[0];
      expect(r.id).toBeTruthy();
      expect(r.createdAt).toBeTruthy();
    });

    it('genererer unike IDer for to påminnelser', () => {
      service.addManualReminder(minReminder());
      service.addManualReminder(minReminder());
      const [r1, r2] = service.manualReminders();
      expect(r1.id).not.toBe(r2.id);
    });

    it('bevarer felt som gjentagelse og skole-flagg', () => {
      service.addManualReminder(minReminder({ isSchoolRelated: true, recurrence: { type: 'weekly' } }));
      const r = service.manualReminders()[0];
      expect(r.isSchoolRelated).toBe(true);
      expect(r.recurrence?.type).toBe('weekly');
    });
  });

  describe('updateManualReminder', () => {
    it('oppdaterer tittel og beholder id', () => {
      service.addManualReminder(minReminder({ title: 'Gammel' }));
      const id = service.manualReminders()[0].id;
      service.updateManualReminder(id, minReminder({ title: 'Ny' }));
      expect(service.manualReminders()[0].title).toBe('Ny');
      expect(service.manualReminders()[0].id).toBe(id);
    });

    it('berører ikke andre påminnelser', () => {
      service.addManualReminder(minReminder({ title: 'A' }));
      service.addManualReminder(minReminder({ title: 'B' }));
      service.updateManualReminder(service.manualReminders()[0].id, minReminder({ title: 'A oppdatert' }));
      expect(service.manualReminders()[1].title).toBe('B');
    });
  });

  describe('deleteManualReminder', () => {
    it('fjerner påminnelsen fra signalet', () => {
      service.addManualReminder(minReminder());
      service.deleteManualReminder(service.manualReminders()[0].id);
      expect(service.manualReminders()).toEqual([]);
    });

    it('fjerner bare den angitte påminnelsen', () => {
      service.addManualReminder(minReminder({ title: 'A' }));
      service.addManualReminder(minReminder({ title: 'B' }));
      service.deleteManualReminder(service.manualReminders()[0].id);
      expect(service.manualReminders().length).toBe(1);
      expect(service.manualReminders()[0].title).toBe('B');
    });
  });
});

// ── savePlanForChild ──────────────────────────────────────────
import type { PlanMetadata, SchoolEvent } from '../../features/school-plan/models/school-plan.models';

const minMeta = (uke: number, aar = 2025): PlanMetadata => ({ uke, aar });

const minEvent = (title: string): SchoolEvent => ({
  date: '2025-04-28',
  title,
  description: '',
  category: 'information',
});

describe('SchoolDataService – savePlanForChild', () => {
  let service: SchoolDataService;
  const childId = 'barn-1';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockHouseholdId.set(null);

    const injector = Injector.create({
      providers: [
        SchoolDataService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: DestroyRef, useValue: { onDestroy: vi.fn() } },
      ],
    });
    service = injector.get(SchoolDataService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lagrer uke 17 og uke 18 som separate planer', () => {
    service.savePlanForChild(childId, minMeta(17), [minEvent('Kunst og håndverk')]);
    service.savePlanForChild(childId, minMeta(18), [minEvent('Matematikk')]);

    const plans = service.plansMap()[childId];
    expect(plans).toHaveLength(2);
    expect(plans[0].metadata.uke).toBe(17);
    expect(plans[1].metadata.uke).toBe(18);
  });

  it('uke 17-planen er urørt etter at uke 18 skannes inn', () => {
    service.savePlanForChild(childId, minMeta(17), [minEvent('Kunst og håndverk')]);
    service.savePlanForChild(childId, minMeta(18), [minEvent('Matematikk')]);

    const uke17 = service.plansMap()[childId].find((p) => p.metadata.uke === 17);
    expect(uke17).toBeDefined();
    expect(uke17!.events[0].title).toBe('Kunst og håndverk');
  });

  it('overskriver bare riktig uke ved ny skanning av samme uke', () => {
    service.savePlanForChild(childId, minMeta(17), [minEvent('Gammel tittel')]);
    service.savePlanForChild(childId, minMeta(18), [minEvent('Uke 18-hendelse')]);
    service.savePlanForChild(childId, minMeta(18), [minEvent('Oppdatert uke 18')]);

    const plans = service.plansMap()[childId];
    expect(plans).toHaveLength(2);
    expect(plans.find((p) => p.metadata.uke === 17)!.events[0].title).toBe('Gammel tittel');
    expect(plans.find((p) => p.metadata.uke === 18)!.events[0].title).toBe('Oppdatert uke 18');
  });
});

describe('SchoolDataService – calendarEvents', () => {
  setupTestBed();
  let service: SchoolDataService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockHouseholdId.set(null); // ingen Firestore-skriving

    TestBed.configureTestingModule({
      providers: [
        SchoolDataService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
      ],
    });

    service = TestBed.inject(SchoolDataService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addCalendarEvent', () => {
    it('starter med tomt signal', () => {
      expect(service.calendarEvents()).toEqual([]);
    });

    it('legger til hendelse i signalet', () => {
      service.addCalendarEvent(minCalEvent({ title: 'Bursdagsfeiring' }));
      expect(service.calendarEvents().length).toBe(1);
      expect(service.calendarEvents()[0].title).toBe('Bursdagsfeiring');
    });

    it('genererer id og createdAt automatisk', () => {
      service.addCalendarEvent(minCalEvent());
      const e = service.calendarEvents()[0];
      expect(e.id).toBeTruthy();
      expect(e.createdAt).toBeTruthy();
    });

    it('genererer unike IDer for to hendelser', () => {
      service.addCalendarEvent(minCalEvent());
      service.addCalendarEvent(minCalEvent());
      const [e1, e2] = service.calendarEvents();
      expect(e1.id).not.toBe(e2.id);
    });
  });

  describe('updateCalendarEvent', () => {
    it('oppdaterer tittel og beholder id', () => {
      service.addCalendarEvent(minCalEvent({ title: 'Gammel' }));
      const id = service.calendarEvents()[0].id;
      service.updateCalendarEvent(id, minCalEvent({ title: 'Ny' }));
      expect(service.calendarEvents()[0].title).toBe('Ny');
      expect(service.calendarEvents()[0].id).toBe(id);
    });

    it('berører ikke andre hendelser', () => {
      service.addCalendarEvent(minCalEvent({ title: 'A' }));
      service.addCalendarEvent(minCalEvent({ title: 'B' }));
      service.updateCalendarEvent(service.calendarEvents()[0].id, minCalEvent({ title: 'A oppdatert' }));
      expect(service.calendarEvents()[1].title).toBe('B');
    });
  });

  describe('deleteCalendarEvent', () => {
    it('fjerner hendelsen fra signalet', () => {
      service.addCalendarEvent(minCalEvent());
      service.deleteCalendarEvent(service.calendarEvents()[0].id);
      expect(service.calendarEvents()).toEqual([]);
    });

    it('fjerner bare den angitte hendelsen', () => {
      service.addCalendarEvent(minCalEvent({ title: 'A' }));
      service.addCalendarEvent(minCalEvent({ title: 'B' }));
      service.deleteCalendarEvent(service.calendarEvents()[0].id);
      expect(service.calendarEvents().length).toBe(1);
      expect(service.calendarEvents()[0].title).toBe('B');
    });
  });
});

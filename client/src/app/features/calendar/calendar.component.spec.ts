import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Firebase-modulene mockes FØR de importeres av tjenestene
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
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  onSnapshot: vi.fn(() => () => {}),
}));

vi.mock('../../core/firebase', () => ({
  firebaseApp: {},
  firebaseAuth: {},
  firebaseDb: {},
}));

import { TestBed } from '@angular/core/testing';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { signal } from '@angular/core';
import { CalendarComponent } from './calendar.component';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { ResidencyService } from '../../shared/services/residency.service';
import { GoogleCalendarService, type GoogleCalendarEvent } from '../../shared/services/google-calendar.service';
import type { ManualReminder, ManualCalendarEvent, Child } from '../school-plan/models/school-plan.models';

// ── Hjelpe-fabrikker ─────────────────────────────────────────

/** Lager en påminnelse – 2025-06-02 er mandag */
const reminder = (overrides: Partial<ManualReminder> = {}): ManualReminder => ({
  id: 'r1',
  createdAt: '2025-01-01T00:00:00.000Z',
  title: 'Test',
  description: '',
  date: '2025-06-02',
  time: null,
  isSchoolRelated: false,
  assignedTo: [{ type: 'parent', role: 'Mamma' }],
  recurrence: null,
  ...overrides,
});

const calEvent = (overrides: Partial<ManualCalendarEvent> = {}): ManualCalendarEvent => ({
  id: 'e1',
  createdAt: '2025-01-01T00:00:00.000Z',
  title: 'Test',
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

// ── Tester ────────────────────────────────────────────────────

describe('CalendarComponent', () => {
  setupTestBed();
  let comp: CalendarComponent;
  let mockChildren: ReturnType<typeof signal<Child[]>>;

  beforeEach(() => {
    mockChildren = signal<Child[]>([]);

    const mockData = {
      children: mockChildren,
      plansMap: signal({}),
      manualReminders: signal<ManualReminder[]>([]),
      calendarEvents: signal<ManualCalendarEvent[]>([]),
      updateEventInPlan: vi.fn(),
      deleteEventFromPlan: vi.fn(),
      addManualReminder: vi.fn(),
      updateManualReminder: vi.fn(),
      deleteManualReminder: vi.fn(),
      addCalendarEvent: vi.fn(),
      updateCalendarEvent: vi.fn(),
      deleteCalendarEvent: vi.fn(),
    };

    const mockResidency = {
      residencyForDate: vi.fn().mockReturnValue(null),
    };

    const mockGoogle = {
      selectedCalendarId: signal<string | null>(null),
      events: signal<GoogleCalendarEvent[]>([]),
      fetchEventsForRange: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SchoolDataService, useValue: mockData },
        { provide: ResidencyService, useValue: mockResidency },
        { provide: GoogleCalendarService, useValue: mockGoogle },
      ],
    });

    comp = TestBed.runInInjectionContext(() => new CalendarComponent());
  });

  // ── Privat hjelpemetode: reminderOccursOnDate ─────────────

  describe('reminderOccursOnDate', () => {
    const fn = (r: ManualReminder, date: string): boolean =>
      (comp as any).reminderOccursOnDate(r, date);

    it('matcher nøyaktig dato uten gjentagelse', () => {
      expect(fn(reminder({ date: '2025-06-02' }), '2025-06-02')).toBe(true);
    });

    it('matcher ikke feil dato uten gjentagelse', () => {
      expect(fn(reminder({ date: '2025-06-02' }), '2025-06-03')).toBe(false);
    });

    it('returnerer false for dato FØR startdato', () => {
      expect(fn(reminder({ date: '2025-06-09', recurrence: { type: 'weekly' } }), '2025-06-02')).toBe(false);
    });

    describe('weekly gjentagelse', () => {
      it('matcher startdato (uke 0)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-02')).toBe(true);
      });

      it('matcher samme ukedag neste uke (+7 dager)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-09')).toBe(true);
      });

      it('matcher to uker frem (+14 dager)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-16')).toBe(true);
      });

      it('matcher ikke annen ukedag (tirsdag)', () => {
        // 2025-06-03 er tirsdag, 2025-06-02 er mandag
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-03')).toBe(false);
      });
    });

    describe('biweekly gjentagelse', () => {
      it('matcher startdato (uke 0)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-02')).toBe(true);
      });

      it('matcher IKKE 1 uke frem (odde uke)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-09')).toBe(false);
      });

      it('matcher 2 uker frem (jevn uke)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-16')).toBe(true);
      });

      it('matcher IKKE 3 uker frem (odde uke)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-23')).toBe(false);
      });

      it('matcher 4 uker frem (jevn uke)', () => {
        expect(fn(reminder({ date: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-30')).toBe(true);
      });
    });
  });

  // ── Privat hjelpemetode: calendarEventOccursOnDate ────────

  describe('calendarEventOccursOnDate', () => {
    const fn = (ev: ManualCalendarEvent, date: string): boolean =>
      (comp as any).calendarEventOccursOnDate(ev, date);

    it('matcher nøyaktig startdato for endagshendelse', () => {
      expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02' }), '2025-06-02')).toBe(true);
    });

    it('matcher ikke dagen etter endagshendelse', () => {
      expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02' }), '2025-06-03')).toBe(false);
    });

    it('returnerer false for dato FØR startdato', () => {
      expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02' }), '2025-06-01')).toBe(false);
    });

    it('matcher alle dager i fler-dags-hendelse', () => {
      const ev = calEvent({ startDate: '2025-06-02', endDate: '2025-06-04' });
      expect(fn(ev, '2025-06-02')).toBe(true);
      expect(fn(ev, '2025-06-03')).toBe(true);
      expect(fn(ev, '2025-06-04')).toBe(true);
      expect(fn(ev, '2025-06-05')).toBe(false);
    });

    describe('weekly gjentagelse', () => {
      it('matcher startdato', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-02')).toBe(true);
      });

      it('matcher 1 uke frem', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-09')).toBe(true);
      });

      it('matcher ikke midtpunkt mellom gjentagelser', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-05')).toBe(false);
      });
    });

    describe('biweekly gjentagelse', () => {
      it('matcher startdato', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-02')).toBe(true);
      });

      it('matcher IKKE 1 uke frem', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-09')).toBe(false);
      });

      it('matcher 2 uker frem', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', endDate: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-16')).toBe(true);
      });
    });
  });

  // ── Privat hjelpemetode: isFirstDayOfOccurrence ───────────

  describe('isFirstDayOfOccurrence', () => {
    const fn = (ev: ManualCalendarEvent, date: string): boolean =>
      (comp as any).isFirstDayOfOccurrence(ev, date);

    it('uten gjentagelse: true kun for startdato', () => {
      expect(fn(calEvent({ startDate: '2025-06-02' }), '2025-06-02')).toBe(true);
    });

    it('uten gjentagelse: false for dagen etter', () => {
      expect(fn(calEvent({ startDate: '2025-06-02' }), '2025-06-03')).toBe(false);
    });

    describe('weekly gjentagelse', () => {
      it('true for startdato', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-02')).toBe(true);
      });

      it('true eksakt 7 dager frem', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-09')).toBe(true);
      });

      it('false for dag 8 (ikke nøyaktig 7)', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', recurrence: { type: 'weekly' } }), '2025-06-10')).toBe(false);
      });
    });

    describe('biweekly gjentagelse', () => {
      it('true for startdato', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-02')).toBe(true);
      });

      it('false eksakt 7 dager frem', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-09')).toBe(false);
      });

      it('true eksakt 14 dager frem', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-16')).toBe(true);
      });

      it('false eksakt 21 dager frem', () => {
        expect(fn(calEvent({ startDate: '2025-06-02', recurrence: { type: 'biweekly' } }), '2025-06-23')).toBe(false);
      });
    });
  });

  // ── Offentlig: getAssignedLabel ───────────────────────────

  describe('getAssignedLabel', () => {
    it('returnerer Mamma for forelder-rolle Mamma', () => {
      expect(comp.getAssignedLabel([{ type: 'parent', role: 'Mamma' }])).toBe('Mamma');
    });

    it('returnerer Pappa for forelder-rolle Pappa', () => {
      expect(comp.getAssignedLabel([{ type: 'parent', role: 'Pappa' }])).toBe('Pappa');
    });

    it('returnerer barnets navn for kjent barn-id', () => {
      mockChildren.set([{ id: 'c1', name: 'Emma', grade: '3', color: '#ff0000' }]);
      expect(comp.getAssignedLabel([{ type: 'child', childId: 'c1' }])).toBe('Emma');
    });

    it('returnerer Ukjent for ukjent barn-id', () => {
      mockChildren.set([]);
      expect(comp.getAssignedLabel([{ type: 'child', childId: 'ukjent-id' }])).toBe('Ukjent');
    });

    it('returnerer flere navn separert med ·', () => {
      mockChildren.set([{ id: 'c1', name: 'Emma', grade: '3', color: '#ff0000' }]);
      expect(comp.getAssignedLabel([{ type: 'parent', role: 'Mamma' }, { type: 'child', childId: 'c1' }])).toBe('Mamma · Emma');
    });
  });

  // ── Offentlig: getAssignedColor ───────────────────────────

  describe('getAssignedColor', () => {
    it('Mamma-farge er rose (#F43F5E)', () => {
      expect(comp.getAssignedColor([{ type: 'parent', role: 'Mamma' }])).toBe('#F43F5E');
    });

    it('Pappa-farge er blå (#3B82F6)', () => {
      expect(comp.getAssignedColor([{ type: 'parent', role: 'Pappa' }])).toBe('#3B82F6');
    });

    it('returnerer barnets farge for kjent barn-id', () => {
      mockChildren.set([{ id: 'c1', name: 'Emma', grade: '3', color: '#abc123' }]);
      expect(comp.getAssignedColor([{ type: 'child', childId: 'c1' }])).toBe('#abc123');
    });

    it('returnerer fallback-farge for ukjent barn (#6B7280)', () => {
      mockChildren.set([]);
      expect(comp.getAssignedColor([{ type: 'child', childId: 'ukjent' }])).toBe('#6B7280');
    });
  });

  // ── Offentlig: formatManualEventTimeLabel ─────────────────

  describe('formatManualEventTimeLabel', () => {
    it('heldagshendelse samme dag returnerer "Hele dagen"', () => {
      expect(
        comp.formatManualEventTimeLabel(
          calEvent({ isAllDay: true, startDate: '2025-06-02', endDate: '2025-06-02' })
        )
      ).toBe('Hele dagen');
    });

    it('heldagshendelse over flere dager inneholder "Hele dagen" og begge datoer', () => {
      const label = comp.formatManualEventTimeLabel(
        calEvent({ isAllDay: true, startDate: '2025-06-02', endDate: '2025-06-04' })
      );
      expect(label).toContain('Hele dagen');
      expect(label).toContain('02.06');
      expect(label).toContain('04.06');
    });

    it('tidfestet hendelse med start og sluttid', () => {
      expect(
        comp.formatManualEventTimeLabel(
          calEvent({ isAllDay: false, startTime: '09:00', endTime: '10:30' })
        )
      ).toBe('09:00 – 10:30');
    });

    it('tidfestet hendelse uten sluttid viser bare starttid', () => {
      expect(
        comp.formatManualEventTimeLabel(
          calEvent({ isAllDay: false, startTime: '14:00', endTime: null })
        )
      ).toBe('14:00');
    });

    it('tidfestet hendelse uten starttid returnerer tom streng', () => {
      expect(
        comp.formatManualEventTimeLabel(
          calEvent({ isAllDay: false, startTime: null, endTime: null })
        )
      ).toBe('');
    });
  });
});

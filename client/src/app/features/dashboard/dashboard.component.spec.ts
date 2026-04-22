import { vi, describe, it, expect, beforeEach } from 'vitest';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

// Firebase-modulene mockes FØR de importeres av tjenestene
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
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

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  updateDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(() => ({})),
  arrayUnion: vi.fn((...args: unknown[]) => args),
}));

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(() => Promise.resolve('test-token')),
  onMessage: vi.fn(() => () => {}),
}));

import { signal, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { ResidencyService } from '../../shared/services/residency.service';
import { GoogleCalendarService } from '../../shared/services/google-calendar.service';
import { SchoolEvent, Child, SavedPlan } from '../school-plan/models/school-plan.models';
import { provideHttpClient } from '@angular/common/http';

// ── Testdata-hjelpere ────────────────────────────────────────────────────────

function makeChild(overrides: Partial<Child> = {}): Child {
  return {
    id: 'barn-1',
    name: 'Emma',
    color: '#3B82F6',
    grade: '3. klasse',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<SchoolEvent> = {}): SchoolEvent {
  return {
    date: '2026-04-22',
    title: 'Les side 12',
    description: '',
    category: 'homework',
    ...overrides,
  };
}

// ── Mock-tjenester ───────────────────────────────────────────────────────────

function makeMockDataService() {
  return {
    children: signal<Child[]>([]),
    activeChildId: signal<string | null>(null),
    activeChild: computed(() => null),
    activePlan: computed<SavedPlan | null>(() => null),
    activePlanEvents: computed(() => []),
    activePlanMetadata: computed(() => null),
    plansMap: signal<{ [childId: string]: SavedPlan[] }>({}),
    residencyOverrides: signal({}),
    baseRotation: signal(null),
    householdLabel: signal<'Mamma' | 'Pappa' | null>(null),
    dataLoaded: signal(true),
    googleCalendarId: signal<string | null>(null),
    activeWeek: signal<{ uke: number; aar: number } | null>(null),
    sharedConfigLoaded: signal(true),
    settings: computed(() => ({ parentLabels: { A: 'Mamma', B: 'Pappa' } })),
    updateEventInPlan: vi.fn(),
    deleteEventFromPlan: vi.fn(),
    setResidencyOverride: vi.fn(),
  };
}

function makeMockResidencyService() {
  return {
    residencyForDate: vi.fn((_date: string) => null as 'Mamma' | 'Pappa' | null),
    todayResidency: computed(() => null as 'Mamma' | 'Pappa' | null),
    colorClass: vi.fn(() => 'bg-gray-100 text-gray-500'),
  };
}

function makeMockGoogleCalendarService() {
  return {
    events: signal([]),
    calendars: signal([]),
    selectedCalendarId: signal(null),
    refresh: vi.fn(),
  };
}

// ── Tester ───────────────────────────────────────────────────────────────────

describe('DashboardComponent – redigering av hendelser', () => {
  let mockData: ReturnType<typeof makeMockDataService>;

  setupTestBed({
    imports: [DashboardComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: SchoolDataService, useFactory: () => mockData },
      { provide: ResidencyService, useValue: makeMockResidencyService() },
      { provide: GoogleCalendarService, useValue: makeMockGoogleCalendarService() },
    ],
  });

  beforeEach(() => {
    mockData = makeMockDataService();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  // ── openEditEvent ──────────────────────────────────────────────────────────

  describe('openEditEvent', () => {
    it('setter editingTaggedEvent til den gitte hendelsen', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild();
      const event = makeEvent();
      const tagged = { ...event, childName: child.name, childColor: child.color, childId: child.id, planRef: event };

      comp.openEditEvent(tagged);

      expect(comp.editingTaggedEvent()).toBe(tagged);
    });

    it('erstatter en allerede åpen hendelse', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild();
      const event1 = makeEvent({ title: 'Første' });
      const event2 = makeEvent({ title: 'Andre' });
      const tagged1 = { ...event1, childName: child.name, childColor: child.color, childId: child.id, planRef: event1 };
      const tagged2 = { ...event2, childName: child.name, childColor: child.color, childId: child.id, planRef: event2 };

      comp.openEditEvent(tagged1);
      comp.openEditEvent(tagged2);

      expect(comp.editingTaggedEvent()?.title).toBe('Andre');
    });
  });

  // ── openEditEventForChild ──────────────────────────────────────────────────

  describe('openEditEventForChild', () => {
    it('setter editingTaggedEvent med barnets info', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild({ id: 'barn-42', name: 'Lise', color: '#EC4899' });
      const event = makeEvent({ title: 'Ukelekse: Les' });

      comp.openEditEventForChild(child, event);

      const result = comp.editingTaggedEvent();
      expect(result?.childId).toBe('barn-42');
      expect(result?.childName).toBe('Lise');
      expect(result?.childColor).toBe('#EC4899');
    });

    it('setter planRef til originalhendelsen', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild();
      const event = makeEvent();

      comp.openEditEventForChild(child, event);

      expect(comp.editingTaggedEvent()?.planRef).toBe(event);
    });

    it('kopierer hendelse-data til TaggedEvent', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild();
      const event = makeEvent({ title: 'Matte side 5', description: 'Løs oppgave 3', category: 'homework' });

      comp.openEditEventForChild(child, event);

      const result = comp.editingTaggedEvent()!;
      expect(result.title).toBe('Matte side 5');
      expect(result.description).toBe('Løs oppgave 3');
      expect(result.category).toBe('homework');
      expect(result.date).toBe('2026-04-22');
    });
  });

  // ── onEventSaved ──────────────────────────────────────────────────────────

  describe('onEventSaved', () => {
    it('kaller updateEventInPlan med riktige argumenter', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild({ id: 'barn-1' });
      const originalEvent = makeEvent({ title: 'Original' });
      const updatedEvent = makeEvent({ title: 'Oppdatert', completed: true });

      comp.openEditEventForChild(child, originalEvent);
      comp.onEventSaved(updatedEvent);

      expect(mockData.updateEventInPlan).toHaveBeenCalledWith('barn-1', originalEvent, updatedEvent);
    });

    it('nullstiller editingTaggedEvent etter lagring', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild();
      const event = makeEvent();

      comp.openEditEventForChild(child, event);
      comp.onEventSaved(makeEvent({ title: 'Ny tittel' }));

      expect(comp.editingTaggedEvent()).toBeNull();
    });

    it('gjør ingenting dersom editingTaggedEvent er null', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;

      comp.onEventSaved(makeEvent());

      expect(mockData.updateEventInPlan).not.toHaveBeenCalled();
    });
  });

  // ── onEventDeleted ────────────────────────────────────────────────────────

  describe('onEventDeleted', () => {
    it('kaller deleteEventFromPlan med riktige argumenter', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild({ id: 'barn-1' });
      const originalEvent = makeEvent({ title: 'Slett meg' });

      comp.openEditEventForChild(child, originalEvent);
      comp.onEventDeleted();

      expect(mockData.deleteEventFromPlan).toHaveBeenCalledWith('barn-1', originalEvent);
    });

    it('nullstiller editingTaggedEvent etter sletting', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      const child = makeChild();
      const event = makeEvent();

      comp.openEditEventForChild(child, event);
      comp.onEventDeleted();

      expect(comp.editingTaggedEvent()).toBeNull();
    });

    it('gjør ingenting dersom editingTaggedEvent er null', () => {
      const fixture = createComponent();
      const comp = fixture.componentInstance;

      comp.onEventDeleted();

      expect(mockData.deleteEventFromPlan).not.toHaveBeenCalled();
    });
  });
});

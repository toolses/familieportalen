import { create } from 'zustand';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Child,
  BaseRotation,
  ResidencyOverrides,
  ManualReminder,
  ManualCalendarEvent,
  HouseholdMember,
  SavedPlan,
  FamilyState,
} from '../types/family.types';
import { toIsoDate, todayIso, tomorrowIso, yesterdayIso } from '../utils/date-utils';

interface FamilyStore {
  children: Child[];
  baseRotation: BaseRotation | null;
  residencyOverrides: ResidencyOverrides;
  householdLabel: 'Mamma' | 'Pappa' | null;
  manualReminders: ManualReminder[];
  calendarEvents: ManualCalendarEvent[];
  plansMap: { [childId: string]: SavedPlan[] };
  householdId: string | null;
  inviteCode: string | null;
  members: HouseholdMember[];
  isLoading: boolean;

  listenToHousehold: (householdId: string) => () => void;
  getCurrentParent: (date: Date) => 'Mamma' | 'Pappa' | null;
  isSwitchDayTomorrow: () => boolean;
  setResidencyOverride: (isoDate: string, value: 'Mamma' | 'Pappa' | null) => Promise<void>;
  reset: () => void;

  // Child management
  addChild: (childData: Omit<Child, 'id'>) => Promise<void>;
  updateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;

  // Rotation management
  setBaseRotation: (rotation: BaseRotation) => Promise<void>;
  clearBaseRotation: () => Promise<void>;
  setHouseholdLabel: (label: 'Mamma' | 'Pappa' | null) => Promise<void>;

  // Member management
  setMemberParentRole: (uid: string, role: 'Mamma' | 'Pappa' | null) => Promise<void>;
  makeAdmin: (uid: string) => Promise<void>;
  removeMember: (uid: string) => Promise<void>;

  // Data management
  deleteAllData: () => Promise<void>;
}

const INITIAL_STATE = {
  children: [],
  baseRotation: null,
  residencyOverrides: {},
  householdLabel: null,
  manualReminders: [],
  calendarEvents: [],
  plansMap: {},
  householdId: null,
  inviteCode: null,
  members: [],
  isLoading: true,
};

export function residencyForDate(
  dateStr: string,
  overrides: ResidencyOverrides,
  rotation: BaseRotation | null,
  householdLabel: 'Mamma' | 'Pappa' | null,
): 'Mamma' | 'Pappa' | null {
  if (dateStr in overrides) return overrides[dateStr];
  if (!rotation) return householdLabel;

  const startMs = new Date(rotation.startDate + 'T00:00:00').getTime();
  const dateMs = new Date(dateStr + 'T00:00:00').getTime();
  const diffDays = Math.round((dateMs - startMs) / 86_400_000);
  const blockSize = rotation.frequency === 'weekly' ? 7 : 14;
  const slot = Math.floor(diffDays / blockSize);
  const isEvenSlot = ((slot % 2) + 2) % 2 === 0;

  return isEvenSlot
    ? rotation.startLabel
    : rotation.startLabel === 'Mamma' ? 'Pappa' : 'Mamma';
}

export const useFamilyStore = create<FamilyStore>((set, get) => ({
  ...INITIAL_STATE,

  listenToHousehold: (householdId: string) => {
    set({ householdId, isLoading: true });

    const unsubscribe = onSnapshot(
      doc(db, 'households', householdId),
      (snap) => {
        if (!snap.exists()) {
          set({ isLoading: false });
          return;
        }

        const state = snap.data() as FamilyState;

        const reminders = (state.manualReminders ?? []).map((r) => ({
          ...r,
          assignedTo: Array.isArray(r.assignedTo) ? r.assignedTo : [r.assignedTo],
        }));
        const calEvents = (state.calendarEvents ?? []).map((e) => ({
          ...e,
          assignedTo: Array.isArray(e.assignedTo) ? e.assignedTo : [e.assignedTo],
        }));

        set({
          children: state.children ?? [],
          baseRotation: state.baseRotation ?? null,
          residencyOverrides: state.residencyOverrides ?? {},
          householdLabel: state.householdLabel ?? null,
          manualReminders: reminders,
          calendarEvents: calEvents,
          plansMap: state.plans ?? {},
          inviteCode: state.inviteCode ?? null,
          members: state.members ?? [],
          isLoading: false,
        });
      },
      () => set({ isLoading: false }),
    );

    return unsubscribe;
  },

  getCurrentParent: (date: Date) => {
    const { residencyOverrides: overrides, baseRotation: rotation, householdLabel } = get();
    return residencyForDate(toIsoDate(date), overrides, rotation, householdLabel);
  },

  isSwitchDayTomorrow: () => {
    const { residencyOverrides: overrides, baseRotation: rotation, householdLabel } = get();
    const today = residencyForDate(todayIso(), overrides, rotation, householdLabel);
    const tomorrow = residencyForDate(tomorrowIso(), overrides, rotation, householdLabel);
    const yesterday = residencyForDate(yesterdayIso(), overrides, rotation, householdLabel);

    const isSwitchToday = today !== null && yesterday !== null && today !== yesterday;
    const isSwitchTomorrow = today !== null && tomorrow !== null && today !== tomorrow;

    return isSwitchToday || isSwitchTomorrow;
  },

  setResidencyOverride: async (isoDate: string, value: 'Mamma' | 'Pappa' | null): Promise<void> => {
    const { householdId, residencyOverrides } = get();
    if (!householdId) return;

    const updated = { ...residencyOverrides };
    if (value === null) {
      delete updated[isoDate];
    } else {
      updated[isoDate] = value;
    }

    await updateDoc(doc(db, 'households', householdId), {
      residencyOverrides: updated,
    });
  },

  reset: () => set({ ...INITIAL_STATE, isLoading: false }),

  addChild: async (childData: Omit<Child, 'id'>): Promise<void> => {
    const { householdId, children } = get();
    if (!householdId) return;
    const newChild: Child = { id: crypto.randomUUID(), ...childData };
    await updateDoc(doc(db, 'households', householdId), {
      children: [...children, newChild],
    });
  },

  updateChild: async (id: string, updates: Partial<Omit<Child, 'id'>>): Promise<void> => {
    const { householdId, children } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      children: children.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  },

  deleteChild: async (id: string): Promise<void> => {
    const { householdId, children } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      children: children.filter((c) => c.id !== id),
    });
  },

  setBaseRotation: async (rotation: BaseRotation): Promise<void> => {
    const { householdId } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), { baseRotation: rotation });
  },

  clearBaseRotation: async (): Promise<void> => {
    const { householdId } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), { baseRotation: null });
  },

  setHouseholdLabel: async (label: 'Mamma' | 'Pappa' | null): Promise<void> => {
    const { householdId } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), { householdLabel: label });
  },

  setMemberParentRole: async (uid: string, role: 'Mamma' | 'Pappa' | null): Promise<void> => {
    const { householdId, members } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      members: members.map((m) => (m.uid === uid ? { ...m, parentRole: role } : m)),
    });
  },

  makeAdmin: async (uid: string): Promise<void> => {
    const { householdId, members } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      members: members.map((m) => (m.uid === uid ? { ...m, role: 'Admin' } : m)),
    });
  },

  removeMember: async (uid: string): Promise<void> => {
    const { householdId, members } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      members: members.filter((m) => m.uid !== uid),
    });
  },

  deleteAllData: async (): Promise<void> => {
    const { householdId } = get();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      children: [],
      baseRotation: null,
      residencyOverrides: {},
      manualReminders: [],
      calendarEvents: [],
      plans: {},
    });
  },
}));

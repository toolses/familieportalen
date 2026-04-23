import { create } from 'zustand';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useFamilyStore } from './useFamilyStore';
import type { ManualReminder, ManualCalendarEvent } from '../types/family.types';

const newId = () =>
  Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

interface CalendarStore {
  getRemindersForDate: (isoDate: string) => ManualReminder[];
  getEventsForDate: (isoDate: string) => ManualCalendarEvent[];
  addReminder: (data: Omit<ManualReminder, 'id' | 'createdAt'>) => Promise<void>;
  updateReminder: (id: string, data: Partial<Omit<ManualReminder, 'id' | 'createdAt'>>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  addCalendarEvent: (data: Omit<ManualCalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateCalendarEvent: (id: string, data: Partial<Omit<ManualCalendarEvent, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;
}

function matchesRecurrence(
  baseIso: string,
  targetIso: string,
  type: 'weekly' | 'biweekly',
): boolean {
  const base = new Date(baseIso + 'T00:00:00');
  const target = new Date(targetIso + 'T00:00:00');
  if (base.getDay() !== target.getDay()) return false;
  if (target < base) return false;
  const diffWeeks = Math.round(
    (target.getTime() - base.getTime()) / (7 * 24 * 3600 * 1000),
  );
  return type === 'weekly' || diffWeeks % 2 === 0;
}

export const useCalendarStore = create<CalendarStore>(() => ({
  getRemindersForDate: (isoDate: string): ManualReminder[] => {
    const { manualReminders } = useFamilyStore.getState();
    return manualReminders.filter((r) =>
      r.recurrence
        ? matchesRecurrence(r.date, isoDate, r.recurrence.type)
        : r.date === isoDate,
    );
  },

  getEventsForDate: (isoDate: string): ManualCalendarEvent[] => {
    const { calendarEvents } = useFamilyStore.getState();
    return calendarEvents.filter(
      (e) => e.startDate <= isoDate && e.endDate >= isoDate,
    );
  },

  addReminder: async (data) => {
    const { householdId, manualReminders } = useFamilyStore.getState();
    if (!householdId) return;
    const item: ManualReminder = {
      ...data,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, 'households', householdId), {
      manualReminders: [...manualReminders, item],
    });
  },

  updateReminder: async (id, data) => {
    const { householdId, manualReminders } = useFamilyStore.getState();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      manualReminders: manualReminders.map((r) =>
        r.id === id ? { ...r, ...data } : r,
      ),
    });
  },

  deleteReminder: async (id) => {
    const { householdId, manualReminders } = useFamilyStore.getState();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      manualReminders: manualReminders.filter((r) => r.id !== id),
    });
  },

  addCalendarEvent: async (data) => {
    const { householdId, calendarEvents } = useFamilyStore.getState();
    if (!householdId) return;
    const item: ManualCalendarEvent = {
      ...data,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, 'households', householdId), {
      calendarEvents: [...calendarEvents, item],
    });
  },

  updateCalendarEvent: async (id, data) => {
    const { householdId, calendarEvents } = useFamilyStore.getState();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      calendarEvents: calendarEvents.map((e) =>
        e.id === id ? { ...e, ...data } : e,
      ),
    });
  },

  deleteCalendarEvent: async (id) => {
    const { householdId, calendarEvents } = useFamilyStore.getState();
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), {
      calendarEvents: calendarEvents.filter((e) => e.id !== id),
    });
  },
}));

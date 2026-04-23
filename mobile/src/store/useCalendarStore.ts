import { create } from 'zustand';
import { useFamilyStore } from './useFamilyStore';
import type { ManualReminder, ManualCalendarEvent } from '../types/family.types';

interface CalendarStore {
  getRemindersForDate: (isoDate: string) => ManualReminder[];
  getEventsForDate: (isoDate: string) => ManualCalendarEvent[];
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
}));

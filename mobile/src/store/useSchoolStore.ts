import { create } from 'zustand';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useFamilyStore } from './useFamilyStore';
import type { TaggedSchoolEvent, SchoolEvent } from '../types/family.types';
import { todayIso } from '../utils/date-utils';

interface SchoolStore {
  getEventsForToday: () => TaggedSchoolEvent[];
  getEventsForDate: (isoDate: string) => TaggedSchoolEvent[];
  toggleHomeworkCompletion: (childId: string, eventDate: string, eventTitle: string) => Promise<void>;
  updateSchoolEvent: (
    childId: string,
    eventDate: string,
    originalTitle: string,
    updates: Partial<Pick<SchoolEvent, 'title' | 'description'>>,
  ) => Promise<void>;
}

export const useSchoolStore = create<SchoolStore>(() => ({
  getEventsForToday: (): TaggedSchoolEvent[] =>
    useSchoolStore.getState().getEventsForDate(todayIso()),

  getEventsForDate: (isoDate: string): TaggedSchoolEvent[] => {
    const { children, plansMap } = useFamilyStore.getState();
    const result: TaggedSchoolEvent[] = [];

    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const latestPlan = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!latestPlan) continue;

      for (const event of latestPlan.events) {
        if (event.date === isoDate) {
          result.push({
            ...event,
            childName: child.name,
            childColor: child.color,
            childId: child.id,
          });
        }
      }
    }

    return result;
  },

  toggleHomeworkCompletion: async (childId: string, eventDate: string, eventTitle: string): Promise<void> => {
    const { householdId, plansMap } = useFamilyStore.getState();
    if (!householdId) return;

    const plans = plansMap[childId] ?? [];
    const planIdx = plans.findIndex((p) =>
      p.events.some((e) => e.date === eventDate && e.title === eventTitle),
    );
    if (planIdx === -1) return;

    const plan = plans[planIdx];
    const eventIdx = plan.events.findIndex(
      (e) => e.date === eventDate && e.title === eventTitle,
    );
    if (eventIdx === -1) return;

    const updatedEvents = plan.events.map((e, i) =>
      i === eventIdx ? { ...e, completed: !e.completed } : e,
    );
    const updatedPlans = plans.map((p, i) =>
      i === planIdx ? { ...p, events: updatedEvents } : p,
    );

    await updateDoc(doc(db, 'households', householdId), {
      [`plans.${childId}`]: updatedPlans,
    });
  },

  updateSchoolEvent: async (childId, eventDate, originalTitle, updates) => {
    const { householdId, plansMap } = useFamilyStore.getState();
    if (!householdId) return;

    const plans = plansMap[childId] ?? [];
    const planIdx = plans.findIndex((p) =>
      p.events.some((e) => e.date === eventDate && e.title === originalTitle),
    );
    if (planIdx === -1) return;

    const plan = plans[planIdx];
    const eventIdx = plan.events.findIndex(
      (e) => e.date === eventDate && e.title === originalTitle,
    );
    if (eventIdx === -1) return;

    const updatedEvents = plan.events.map((e, i) =>
      i === eventIdx ? { ...e, ...updates } : e,
    );
    const updatedPlans = plans.map((p, i) =>
      i === planIdx ? { ...p, events: updatedEvents } : p,
    );

    await updateDoc(doc(db, 'households', householdId), {
      [`plans.${childId}`]: updatedPlans,
    });
  },
}));

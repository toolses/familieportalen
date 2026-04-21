import { Injectable, computed, inject } from '@angular/core';
import { SchoolDataService } from './school-data.service';

@Injectable({ providedIn: 'root' })
export class ResidencyService {
  private data = inject(SchoolDataService);

  /**
   * Returns residency for the given ISO date string.
   * Call this inside a `computed()` to get reactivity — any signal reads
   * inside this method will be tracked by Angular's reactive context.
   */
  residencyForDate(dateStr: string): 'Mamma' | 'Pappa' | null {
    const overrides = this.data.residencyOverrides();
    if (dateStr in overrides) return overrides[dateStr];

    const rotation = this.data.baseRotation();
    if (!rotation) return this.data.householdLabel();

    // Calculate which 14-day rotation slot this date falls in.
    // Slot 0, 2, 4, … → startLabel; slot 1, 3, 5, … → opposite.
    const startMs = new Date(rotation.startDate + 'T00:00:00').getTime();
    const dateMs = new Date(dateStr + 'T00:00:00').getTime();
    const diffDays = Math.round((dateMs - startMs) / 86400000);
    const slot = Math.floor(diffDays / 14);
    const isEvenSlot = ((slot % 2) + 2) % 2 === 0;

    return isEvenSlot
      ? rotation.startLabel
      : rotation.startLabel === 'Mamma' ? 'Pappa' : 'Mamma';
  }

  /** Reactive signal for today's residency. Updates automatically on any state change. */
  readonly todayResidency = computed(() => {
    const d = new Date();
    const iso =
      d.getFullYear() +
      '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
    return this.residencyForDate(iso);
  });

  /** Color class for a given label (Tailwind bg + text). */
  colorClass(label: 'Mamma' | 'Pappa' | null): string {
    if (label === 'Mamma') return 'bg-rose-100 text-rose-700';
    if (label === 'Pappa') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-500';
  }

  /** Vivid color class used for cell backgrounds in the planner grid. */
  cellColorClass(label: 'Mamma' | 'Pappa' | null): string {
    if (label === 'Mamma') return 'bg-rose-100 text-rose-800';
    if (label === 'Pappa') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-50 text-gray-400';
  }

  /** Colored bar class for calendar day header strips. */
  barColorClass(label: 'Mamma' | 'Pappa' | null): string {
    if (label === 'Mamma') return 'bg-rose-400';
    if (label === 'Pappa') return 'bg-blue-400';
    return '';
  }
}

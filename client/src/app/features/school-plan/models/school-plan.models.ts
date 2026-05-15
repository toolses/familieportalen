export interface PlanMetadata {
  uke: number;
  aar: number;
  trinn?: string;
}

export interface SchoolEvent {
  id?: string;
  date: string;
  title: string;
  description: string;
  category: 'school_class' | 'homework' | 'weekly_homework' | 'reminder' | 'information';
  completed?: boolean;
  /** Send push-varsel kl. 06:00 på hendelsesdagen. Mangler felt = true (default PÅ). */
  notify?: boolean;
}

export interface ParseRequest {
  frontImage: string;
  gridImageTop: string;
  gridImageBottom: string;
  weekOverride?: number;
  yearOverride?: number;
}

export interface ParseResponse {
  raw: string;
  rawOcr: string;
  data: {
    metadata: PlanMetadata;
    events: SchoolEvent[];
  };
}

export interface SavedPlan {
  metadata: PlanMetadata;
  events: SchoolEvent[];
  savedAt: string;
  house?: 'A' | 'B';
  images?: { front: string; back?: string };
}

export interface Child {
  id: string;
  name: string;
  color: string;
  grade: string;
}

export interface BaseRotation {
  startDate: string; // ISO date — the first day of the new rotation (typically a Friday)
  startLabel: 'Mamma' | 'Pappa';
  frequency: 'bi-weekly';
}

export type ResidencyOverrides = { [date: string]: 'Mamma' | 'Pappa' | null };

export type RecurrenceType = 'weekly' | 'biweekly';

export interface RecurrenceRule {
  type: RecurrenceType;
}

/** Hvem en påminnelse eller hendelse er knyttet til */
export type AssignedTo =
  | { type: 'child'; childId: string }
  | { type: 'parent'; role: 'Mamma' | 'Pappa' };

export interface ManualReminder {
  id: string;
  title: string;
  description: string;
  /** ISO-dato for første (eller eneste) forekomst */
  date: string;
  /** Klokkeslett i HH:mm format, eller null */
  time: string | null;
  /** Send push-varsel på angitt tidspunkt */
  notify: boolean;
  isSchoolRelated: boolean;
  assignedTo: AssignedTo[];
  recurrence: RecurrenceRule | null;
  createdAt: string;
}

export interface ManualCalendarEvent {
  id: string;
  title: string;
  description: string;
  /** ISO-dato for start */
  startDate: string;
  /** ISO-dato for slutt (samme som startDate for enkeltdags-hendelse) */
  endDate: string;
  /** HH:mm eller null for heldagshendelse */
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  assignedTo: AssignedTo[];
  recurrence: RecurrenceRule | null;
  createdAt: string;
}

export interface FamilyState {
  children: Child[];
  activeChildId: string | null;
  householdLabel: 'Mamma' | 'Pappa' | null;
  plans: { [childId: string]: SavedPlan[] };
  baseRotation: BaseRotation | null;
  residencyOverrides: ResidencyOverrides;
  manualReminders: ManualReminder[];
  calendarEvents: ManualCalendarEvent[];
}

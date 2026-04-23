export interface UserDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  householdId: string | null;
  role: 'Admin' | 'Medlem';
}

export interface HouseholdMember {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: 'Admin' | 'Medlem';
  parentRole: 'Mamma' | 'Pappa' | null;
}

export interface PlanMetadata {
  uke: number;
  aar: number;
  trinn?: string;
}

export interface SchoolEvent {
  date: string;
  title: string;
  description: string;
  category: 'school_class' | 'homework' | 'reminder' | 'information';
  completed?: boolean;
}

export interface SavedPlan {
  metadata: PlanMetadata;
  events: SchoolEvent[];
  savedAt: string;
  house?: 'A' | 'B';
  imageUrls?: {
    weekPlan?: string;
    schedule?: string;
  };
}

export interface Child {
  id: string;
  name: string;
  color: string;
  grade: string;
}

export interface BaseRotation {
  startDate: string;
  startLabel: 'Mamma' | 'Pappa';
  frequency: 'weekly' | 'bi-weekly';
  switchDay?: number; // 0=Man, 1=Tir, 2=Ons, 3=Tor, 4=Fre, 5=Lør, 6=Søn
  primaryParent?: 'Mamma' | 'Pappa';
}

export type ResidencyOverrides = { [date: string]: 'Mamma' | 'Pappa' | null };

export type RecurrenceType = 'weekly' | 'biweekly';

export interface RecurrenceRule {
  type: RecurrenceType;
}

export type AssignedTo =
  | { type: 'child'; childId: string }
  | { type: 'parent'; role: 'Mamma' | 'Pappa' };

export interface ManualReminder {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  isSchoolRelated: boolean;
  assignedTo: AssignedTo[];
  recurrence: RecurrenceRule | null;
  createdAt: string;
}

export interface ManualCalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
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
  inviteCode?: string;
  members?: HouseholdMember[];
}

export interface TaggedSchoolEvent extends SchoolEvent {
  childName: string;
  childColor: string;
  childId: string;
}

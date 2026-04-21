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
}

export interface ParseRequest {
  frontImage: string;
  backImage?: string;
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

export interface FamilyState {
  children: Child[];
  activeChildId: string | null;
  householdLabel: 'Mamma' | 'Pappa' | null;
  plans: { [childId: string]: SavedPlan[] };
  baseRotation: BaseRotation | null;
  residencyOverrides: ResidencyOverrides;
  googleCalendarId?: string | null;
}

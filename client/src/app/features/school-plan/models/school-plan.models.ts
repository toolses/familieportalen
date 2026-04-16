export interface PlanMetadata {
  uke: number;
  aar: number;
  trinn?: string;
}

export interface SchoolEvent {
  date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string;
  category: 'school_class' | 'homework' | 'test' | 'reminder';
}

export interface ParseRequest {
  frontImage: string;
  backImage?: string;
}

export interface ParseResponse {
  raw: string;
  data: {
    metadata: PlanMetadata;
    events: SchoolEvent[];
  };
}

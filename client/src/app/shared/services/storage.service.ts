import { Injectable, inject } from '@angular/core';
import { SchoolDataService } from './school-data.service';
import { PlanMetadata, SchoolEvent, SavedPlan } from '../../features/school-plan/models/school-plan.models';

/**
 * Legacy facade — delegates to SchoolDataService.
 * Kept for backward compatibility with existing components.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private data = inject(SchoolDataService);

  savePlan(metadata: PlanMetadata, events: SchoolEvent[], house?: 'A' | 'B'): Promise<void> {
    this.data.savePlan(metadata, events, house);
    return Promise.resolve();
  }

  getPlans(): SavedPlan[] {
    return this.data.getPlans();
  }

  getPlanByWeek(uke: number, aar: number): SavedPlan | null {
    return this.data.getPlanByWeek(uke, aar);
  }

  getActiveWeek(): { uke: number; aar: number } | null {
    return this.data.getActiveWeek();
  }

  setActiveWeek(uke: number, aar: number): void {
    this.data.setActiveWeek(uke, aar);
  }
}

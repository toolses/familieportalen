import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ParseRequest, ParseResponse } from '../models/school-plan.models';

@Injectable({ providedIn: 'root' })
export class SchoolPlanService {
  private http = inject(HttpClient);

  parse(request: ParseRequest): Observable<ParseResponse> {
    return this.http.post<ParseResponse>('/api/school-plan/parse', request);
  }
}

import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { SkoleComponent } from './features/skole/skole.component';
import { SettingsComponent } from './features/settings/settings.component';
import { GoogleCallbackComponent } from './features/google/google-callback.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'kalender', component: CalendarComponent },
  { path: 'skole', component: SkoleComponent },
  { path: 'innstillinger', component: SettingsComponent },
  { path: 'auth/google/callback', component: GoogleCallbackComponent },
];

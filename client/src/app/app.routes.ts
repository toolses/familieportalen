import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { SkoleComponent } from './features/skole/skole.component';
import { SettingsComponent } from './features/settings/settings.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'kalender', component: CalendarComponent, canActivate: [authGuard] },
  { path: 'skole', component: SkoleComponent, canActivate: [authGuard] },
  { path: 'innstillinger', component: SettingsComponent, canActivate: [authGuard] },
];

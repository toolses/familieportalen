import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { SkoleComponent } from './features/skole/skole.component';
import { SettingsComponent } from './features/settings/settings.component';
import { LoginComponent } from './features/login/login.component';
import { GoogleCallbackComponent } from './features/google/google-callback.component';
import { ListerComponent } from './features/lister/lister.component';
import { ListDetailComponent } from './features/lister/list-detail.component';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'google-callback', component: GoogleCallbackComponent, canActivate: [authGuard] },
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'kalender', component: CalendarComponent, canActivate: [authGuard] },
  { path: 'skole', component: SkoleComponent, canActivate: [authGuard] },
  { path: 'lister', component: ListerComponent, canActivate: [authGuard] },
  { path: 'lister/:id', component: ListDetailComponent, canActivate: [authGuard] },
  { path: 'innstillinger', component: SettingsComponent, canActivate: [authGuard] },
];

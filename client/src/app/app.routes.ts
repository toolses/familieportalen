import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'google-callback',
    loadComponent: () =>
      import('./features/google/google-callback.component').then(
        (m) => m.GoogleCallbackComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'kalender',
    loadComponent: () =>
      import('./features/calendar/calendar.component').then(
        (m) => m.CalendarComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'skole',
    loadComponent: () =>
      import('./features/skole/skole.component').then((m) => m.SkoleComponent),
    canActivate: [authGuard],
  },
  {
    path: 'lister',
    loadComponent: () =>
      import('./features/lister/lister.component').then(
        (m) => m.ListerComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'lister/:id',
    loadComponent: () =>
      import('./features/lister/list-detail.component').then(
        (m) => m.ListDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dokumenter',
    loadComponent: () =>
      import('./features/dokumenter/dokumenter.component').then(
        (m) => m.DokumenterComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'innstillinger',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
    canActivate: [authGuard],
  },
];

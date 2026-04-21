import { Component, inject, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <!-- Header -->
      @if (auth.isLoggedIn()) {
        <header class="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 safe-top">
          <div class="max-w-2xl mx-auto flex items-center justify-between">
            <h1 class="text-lg font-bold text-gray-900">Familieportalen</h1>
            <div class="flex items-center gap-3">
              @if (auth.photoURL()) {
                <img [src]="auth.photoURL()" alt="" class="w-8 h-8 rounded-full" referrerpolicy="no-referrer" />
              }
              <button (click)="logout()" class="text-sm text-gray-500 hover:text-gray-700">Logg ut</button>
            </div>
          </div>
        </header>
      }

      <!-- Content -->
      <main class="flex-1 max-w-2xl mx-auto w-full">
        <router-outlet />
      </main>

      <!-- Bottom nav (only when logged in) -->
      @if (auth.isLoggedIn()) {
        <nav class="bg-white border-t border-gray-200 sticky bottom-0 z-50 safe-bottom">
          <div class="max-w-2xl mx-auto flex">
            <a #rla1="routerLinkActive" routerLink="/" routerLinkActive [routerLinkActiveOptions]="{ exact: true }"
               class="flex-1 flex flex-col items-center py-2 transition-colors border-t-2"
               [class.text-blue-600]="rla1.isActive" [class.border-blue-600]="rla1.isActive"
               [class.text-gray-400]="!rla1.isActive" [class.border-transparent]="!rla1.isActive">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span class="text-xs mt-1 font-medium">Hjem</span>
            </a>
            <a #rla2="routerLinkActive" routerLink="/kalender" routerLinkActive
               class="flex-1 flex flex-col items-center py-2 transition-colors border-t-2"
               [class.text-blue-600]="rla2.isActive" [class.border-blue-600]="rla2.isActive"
               [class.text-gray-400]="!rla2.isActive" [class.border-transparent]="!rla2.isActive">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span class="text-xs mt-1 font-medium">Kalender</span>
            </a>
            <a #rla3="routerLinkActive" routerLink="/skole" routerLinkActive
               class="flex-1 flex flex-col items-center py-2 transition-colors border-t-2"
               [class.text-blue-600]="rla3.isActive" [class.border-blue-600]="rla3.isActive"
               [class.text-gray-400]="!rla3.isActive" [class.border-transparent]="!rla3.isActive">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              <span class="text-xs mt-1 font-medium">Skole</span>
            </a>
            <a #rla4="routerLinkActive" routerLink="/innstillinger" routerLinkActive
               class="flex-1 flex flex-col items-center py-2 transition-colors border-t-2"
               [class.text-blue-600]="rla4.isActive" [class.border-blue-600]="rla4.isActive"
               [class.text-gray-400]="!rla4.isActive" [class.border-transparent]="!rla4.isActive">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span class="text-xs mt-1 font-medium">Innstillinger</span>
            </a>
          </div>
        </nav>
      }
    </div>
  `,
  styles: `
    .safe-top { padding-top: env(safe-area-inset-top); }
    .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  `,
})
export class App {
  auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      if (!this.auth.loading()) {
        const splash = document.getElementById('splash');
        if (splash) {
          splash.style.opacity = '0';
          splash.style.pointerEvents = 'none';
          setTimeout(() => splash.remove(), 350);
        }
      }
    });
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}

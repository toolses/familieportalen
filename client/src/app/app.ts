import { Component, inject, effect, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { AuthService } from './shared/services/auth.service';
import { SchoolDataService } from './shared/services/school-data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      <!-- Header -->
      @if (auth.isLoggedIn()) {
        <header class="shrink-0 bg-white border-b border-gray-200 px-4 py-3 z-50 safe-top">
          <div class="max-w-2xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="28" height="28" style="border-radius:6px">
                  <defs><linearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4f46e5"/><stop offset="100%" style="stop-color:#7c3aed"/></linearGradient></defs>
                  <rect width="512" height="512" rx="96" ry="96" fill="url(#hbg)"/>
                  <polygon points="256,88 432,248 80,248" fill="white" opacity="0.95"/>
                  <rect x="112" y="248" width="288" height="188" rx="4" fill="white" opacity="0.95"/>
                  <rect x="210" y="320" width="92" height="116" rx="10" fill="#4f46e5"/>
                  <circle cx="290" cy="382" r="7" fill="white" opacity="0.8"/>
                  <rect x="136" y="284" width="68" height="60" rx="8" fill="#4f46e5" opacity="0.7"/>
                  <rect x="308" y="284" width="68" height="60" rx="8" fill="#4f46e5" opacity="0.7"/>
                  <rect x="316" y="126" width="40" height="80" rx="4" fill="white" opacity="0.9"/>
                </svg>
                <h1 class="text-lg font-bold text-gray-900">Familieportalen</h1>
              </div>
            <div class="flex items-center gap-3">
              @if (auth.photoURL()) {
                <img [src]="auth.photoURL()" alt="" class="w-8 h-8 rounded-full" referrerpolicy="no-referrer" />
              }
              <button (click)="logout()" class="text-sm text-gray-500 hover:text-gray-700">Logg ut</button>
            </div>
          </div>
        </header>
      }

      <!-- Oppdateringsvarsel -->
      @if (updateAvailable()) {
        <div class="shrink-0 bg-blue-600 text-white px-4 py-2 z-50 flex items-center justify-between gap-3">
          <span class="text-sm">Ny versjon er tilgjengelig</span>
          <button (click)="applyUpdate()" class="text-sm font-semibold underline whitespace-nowrap">
            Oppdater nå
          </button>
        </div>
      }

      <!-- Content -->
      <main class="flex-1 min-h-0 overflow-y-auto overscroll-y-contain max-w-2xl mx-auto w-full">
        <router-outlet />
      </main>

      <!-- Bottom nav (only when logged in) -->
      @if (auth.isLoggedIn()) {
        <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
          <div class="flex items-center justify-around h-16 px-4">
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
            <a #rla4="routerLinkActive" routerLink="/lister" routerLinkActive
               class="flex-1 flex flex-col items-center py-2 transition-colors border-t-2"
               [class.text-blue-600]="rla4.isActive" [class.border-blue-600]="rla4.isActive"
               [class.text-gray-400]="!rla4.isActive" [class.border-transparent]="!rla4.isActive">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span class="text-xs mt-1 font-medium">Lister</span>
            </a>
            <a #rla5="routerLinkActive" routerLink="/innstillinger" routerLinkActive
               class="flex-1 flex flex-col items-center py-2 transition-colors border-t-2"
               [class.text-blue-600]="rla5.isActive" [class.border-blue-600]="rla5.isActive"
               [class.text-gray-400]="!rla5.isActive" [class.border-transparent]="!rla5.isActive">
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
  `,
})
export class App {
  auth = inject(AuthService);
  private data = inject(SchoolDataService);
  private router = inject(Router);
  private swUpdate = inject(SwUpdate);

  updateAvailable = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((evt) => {
        if (evt.type === 'VERSION_READY') {
          this.updateAvailable.set(true);
        }
      });
    }

    // Fjern splash når auth er klar OG (ikke innlogget ELLER data er lastet fra Firestore/cache).
    // Dette sikrer at dashbordet allerede har data når splashen forsvinner.
    effect(() => {
      const authReady = !this.auth.loading();
      const dataReady = !this.auth.isLoggedIn() || this.data.dataLoaded();
      if (authReady && dataReady) {
        this.hideSplash();
      }
    });

    // Sikkerhetsventil: fjern splashen etter maks 4 sekunder uansett hva
    setTimeout(() => this.hideSplash(), 4000);
  }

  private hideSplash(): void {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.pointerEvents = 'none';
      setTimeout(() => splash.remove(), 350);
    }
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }

  async applyUpdate() {
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }
}

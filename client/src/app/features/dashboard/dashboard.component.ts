import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { ResidencyService } from '../../shared/services/residency.service';
import { GoogleCalendarService, GoogleCalendarEvent } from '../../shared/services/google-calendar.service';
import { SchoolEvent, Child } from '../school-plan/models/school-plan.models';
import { formatDateShort, dayName } from '../../shared/utils/date-utils';
import { SwipeDirective } from '../../shared/directives/swipe.directive';

const ACTION_KEYWORDS = ['husk', 'ta med', 'matpakke', 'penger', 'utstyr', 'lade', 'sekk', 'tursekk', 'gymtøy', 'gymsko', 'badetøy', 'skiftetøy', 'turklær'];

interface TaggedEvent extends SchoolEvent {
  childName: string;
  childColor: string;
}

interface ChildUkelekser {
  child: Child;
  events: SchoolEvent[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SwipeDirective],
  template: `
    @if (data.children().length === 0) {
      <div class="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div class="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" x2="19" y1="8" y2="14"/>
            <line x1="22" x2="16" y1="11" y2="11"/>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Velkommen!</h2>
        <p class="text-gray-500 mb-8 max-w-xs">Kom i gang: Legg til ditt første barn for å bruke Familieportalen.</p>
        <button (click)="goToSettings()"
                class="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium text-lg shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform">
          Legg til barn
        </button>
      </div>
    } @else {
      <div class="px-4 pt-2 pb-6 space-y-4" appSwipe (swipeLeft)="nextDay()" (swipeRight)="prevDay()">

        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Hjem</h2>
            <div class="flex items-center gap-1 mt-0.5">
              <button (click)="prevDay()" class="p-1 rounded-lg hover:bg-gray-100 active:scale-[0.9] transition-all text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button (click)="goToToday()" [disabled]="isToday()"
                      class="text-sm font-medium px-1 transition-colors"
                      [class]="isToday() ? 'text-gray-500 cursor-default' : 'text-blue-600'">
                {{ todayLabel() }}
              </button>
              <button (click)="nextDay()" class="p-1 rounded-lg hover:bg-gray-100 active:scale-[0.9] transition-all text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          <!-- Dynamic residency badge with quick-override toggle -->
          <button (click)="showOverridePanel.update(v => !v)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97]"
                  [class]="residencyBadgeClass()">
            @if (selectedDateResidency(); as label) {
              <span>Hos {{ label }}</span>
            } @else {
              <span>Sett samvær</span>
            }
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 [class]="showOverridePanel() ? 'rotate-180 transition-transform' : 'transition-transform'">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        <!-- Quick override panel -->
        @if (showOverridePanel()) {
          <div class="bg-white border border-gray-200 rounded-2xl p-3 shadow-md space-y-2.5">
            <p class="text-xs font-semibold text-gray-600">
              Samvær {{ isToday() ? 'i dag' : todayLabel() }}
            </p>
            <div class="flex gap-2">
              <button (click)="setOverrideForSelected('Mamma')"
                      class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                      [class]="selectedDateResidency() === 'Mamma' ? 'bg-rose-500 text-white shadow-sm' : 'bg-rose-50 text-rose-700'">
                Mamma
              </button>
              <button (click)="setOverrideForSelected('Pappa')"
                      class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                      [class]="selectedDateResidency() === 'Pappa' ? 'bg-blue-500 text-white shadow-sm' : 'bg-blue-50 text-blue-700'">
                Pappa
              </button>
            </div>
            @if (hasOverrideForSelected()) {
              <button (click)="clearOverrideForSelected()"
                      class="w-full text-xs text-gray-400 underline text-center py-0.5">
                Tilbake til standard rotasjon
              </button>
            }
          </div>
        }

        @if (allTodayEvents().length === 0 && todayGoogleEvents().length === 0 && allUkelekser().length === 0 && tomorrowReminders().length === 0) {
          <div class="flex flex-col items-center py-12 text-center">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <p class="text-gray-500 mb-4">Ingen hendelser i dag.</p>
            <button (click)="goToSkole()"
                    class="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform">
              Gå til Skole
            </button>
          </div>
        } @else {

          <!-- Husk i dag! (reminder med action-keywords) -->
          @if (quickActions().length > 0) {
            <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <h3 class="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                Husk i dag!
              </h3>
              <div class="space-y-2">
                @for (event of quickActions(); track $index) {
                  <div class="flex gap-3 items-start bg-white/80 rounded-xl p-3 shadow-xs">
                    <div class="w-2.5 h-2.5 rounded-full mt-1 shrink-0 ring-2 ring-amber-200"
                         [style.background]="event.childColor"></div>
                    <div class="flex-1 min-w-0">
                      <span class="font-semibold text-gray-800 text-sm">{{ event.title }}</span>
                      @if (event.description) {
                        <p class="text-sm text-gray-500 mt-0.5">{{ event.description }}</p>
                      }
                      <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Google Calendar -->
          @if (todayGoogleEvents().length > 0) {
            <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
                 style="border-left: 4px solid #4285F4;">
              <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" class="shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Dagens oversikt
              </h3>
              <div class="space-y-2">
                @for (event of todayGoogleEvents(); track event.id) {
                  <div class="flex gap-3 items-start bg-gray-50 rounded-xl p-3">
                    <div class="w-1 self-stretch rounded-full shrink-0 bg-[#4285F4]"></div>
                    <div class="flex-1 min-w-0">
                      <span class="font-medium text-gray-800 text-sm">{{ event.summary }}</span>
                      @if (event.startTime) {
                        <p class="text-xs text-gray-400 mt-0.5">{{ event.startTime }}@if (event.endTime) { – {{ event.endTime }}}</p>
                      } @else if (event.spanStart && event.spanEnd && event.spanStart !== event.spanEnd) {
                        <p class="text-xs text-gray-400 mt-0.5">{{ formatSpanLabel(event) }}</p>
                      } @else {
                        <p class="text-xs text-gray-400 mt-0.5">Hele dagen</p>
                      }
                      @if (event.location) {
                        <p class="text-xs text-gray-400">{{ event.location }}</p>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Påminnelser -->
          @if (reminderEvents().length > 0) {
            <div class="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <h3 class="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                Påminnelser
              </h3>
              <div class="space-y-2">
                @for (event of reminderEvents(); track $index) {
                  <div class="flex gap-3 items-start bg-white/60 rounded-xl p-3">
                    <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                    <div class="flex-1 min-w-0">
                      <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                      @if (event.description) {
                        <p class="text-sm text-gray-500 mt-0.5">{{ event.description }}</p>
                      }
                      <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Lekser -->
          @if (regularHomeworkEvents().length > 0) {
            <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <h3 class="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                Lekser
              </h3>
              <div class="space-y-2">
                @for (event of regularHomeworkEvents(); track $index) {
                  <div class="flex gap-3 items-start bg-white/60 rounded-xl p-3">
                    <div class="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                    <div class="flex-1 min-w-0">
                      <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                      @if (event.description) {
                        <p class="text-sm text-gray-500 mt-0.5">{{ event.description }}</p>
                      }
                      <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Morgendagens påminnelser -->
          @if (tomorrowReminders().length > 0) {
            <div class="border border-gray-200 rounded-2xl p-4">
              <h3 class="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                I morgen
              </h3>
              <div class="space-y-1.5">
                @for (event of tomorrowReminders(); track $index) {
                  <div class="flex gap-2.5 items-start">
                    <div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                    <div class="flex-1 min-w-0">
                      <span class="text-sm text-gray-500">{{ event.title }}</span>
                      @if (event.description) {
                        <p class="text-xs text-gray-400 mt-0.5">{{ event.description }}</p>
                      }
                      <p class="text-[10px] font-semibold mt-0.5" [style.color]="event.childColor">{{ event.childName }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Ukelekser per barn (sammenleggbar, default lukket) -->
          @for (entry of allUkelekser(); track entry.child.id) {
            <div class="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden">
              <button (click)="toggleUkelekse(entry.child.id)"
                      class="w-full flex items-center justify-between p-4 text-left">
                <h3 class="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Ukelekser
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                        [style.background]="entry.child.color">{{ entry.child.name }}</span>
                </h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     [class]="isUkelekseOpen(entry.child.id) ? 'rotate-180 transition-transform' : 'transition-transform'">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              @if (isUkelekseOpen(entry.child.id)) {
                <div class="px-4 pb-4 space-y-2">
                  @for (event of entry.events; track $index) {
                    <div class="flex gap-3 items-start bg-white/60 rounded-xl p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-amber-400 mt-1 shrink-0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                        @if (event.description) {
                          <p class="text-sm text-gray-500 mt-0.5">{{ event.description }}</p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

        }
      </div>
    }
  `,
  styles: `
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `,
})
export class DashboardComponent {
  data = inject(SchoolDataService);
  residency = inject(ResidencyService);
  private google = inject(GoogleCalendarService);
  private router = inject(Router);

  private ukelekseOpenMap = signal<Record<string, boolean>>({});
  private dayOffset = signal(0);
  showOverridePanel = signal(false);

  private get todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  private selectedDate = computed(() => {
    const base = new Date(this.todayIso + 'T00:00:00');
    base.setDate(base.getDate() + this.dayOffset());
    return base.getFullYear() + '-' + String(base.getMonth() + 1).padStart(2, '0') + '-' + String(base.getDate()).padStart(2, '0');
  });

  private tomorrowDate = computed(() => {
    const base = new Date(this.todayIso + 'T00:00:00');
    base.setDate(base.getDate() + this.dayOffset() + 1);
    return base.getFullYear() + '-' + String(base.getMonth() + 1).padStart(2, '0') + '-' + String(base.getDate()).padStart(2, '0');
  });

  isToday = computed(() => this.dayOffset() === 0);

  prevDay() { this.dayOffset.update((d) => d - 1); this.showOverridePanel.set(false); }
  nextDay() { this.dayOffset.update((d) => d + 1); this.showOverridePanel.set(false); }
  goToToday() { this.dayOffset.set(0); this.showOverridePanel.set(false); }

  todayLabel = computed(() => {
    return this.capitalize(dayName(this.selectedDate())) + ' ' + formatDateShort(this.selectedDate());
  });

  /** Residency for the currently selected date (reactive). */
  selectedDateResidency = computed(() => this.residency.residencyForDate(this.selectedDate()));

  residencyBadgeClass = computed(() => {
    const label = this.selectedDateResidency();
    if (label === 'Mamma') return 'bg-rose-100 text-rose-700';
    if (label === 'Pappa') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-500';
  });

  hasOverrideForSelected = computed(() => {
    const overrides = this.data.residencyOverrides();
    return this.selectedDate() in overrides && overrides[this.selectedDate()] !== null;
  });

  setOverrideForSelected(label: 'Mamma' | 'Pappa'): void {
    this.data.setResidencyOverride(this.selectedDate(), label);
    this.showOverridePanel.set(false);
  }

  clearOverrideForSelected(): void {
    this.data.setResidencyOverride(this.selectedDate(), null);
    this.showOverridePanel.set(false);
  }

  todayGoogleEvents = computed<GoogleCalendarEvent[]>(() => {
    return this.google.events().filter((e) => e.date === this.selectedDate());
  });

  allTodayEvents = computed<TaggedEvent[]>(() => {
    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const date = this.selectedDate();
    const result: TaggedEvent[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!plan) continue;
      for (const e of plan.events) {
        if (e.date === date && !this.isUkelekse(e)) {
          result.push({ ...e, childName: child.name, childColor: child.color });
        }
      }
    }
    return result;
  });

  quickActions = computed<TaggedEvent[]>(() => {
    return this.allTodayEvents().filter((e) => {
      if (e.category !== 'reminder') return false;
      const text = (e.title + ' ' + (e.description ?? '')).toLowerCase();
      return ACTION_KEYWORDS.some((kw) => text.includes(kw));
    });
  });

  reminderEvents = computed<TaggedEvent[]>(() => {
    const qaSet = new Set(this.quickActions());
    return this.allTodayEvents().filter((e) => e.category === 'reminder' && !qaSet.has(e));
  });

  regularHomeworkEvents = computed<TaggedEvent[]>(() => {
    return this.allTodayEvents().filter((e) => e.category === 'homework');
  });

  tomorrowReminders = computed<TaggedEvent[]>(() => {
    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const date = this.tomorrowDate();
    const result: TaggedEvent[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!plan) continue;
      for (const e of plan.events) {
        if (e.date === date && e.category === 'reminder') {
          result.push({ ...e, childName: child.name, childColor: child.color });
        }
      }
    }
    return result;
  });

  // Ukelekser grouped per child
  allUkelekser = computed<ChildUkelekser[]>(() => {
    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const result: ChildUkelekser[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!plan) continue;
      const ukelekser = plan.events.filter((e) => e.category === 'homework' && this.isUkelekse(e));
      if (ukelekser.length > 0) result.push({ child, events: ukelekser });
    }
    return result;
  });

  toggleUkelekse(childId: string): void {
    this.ukelekseOpenMap.update((m) => ({ ...m, [childId]: !m[childId] }));
  }

  isUkelekseOpen(childId: string): boolean {
    return !!this.ukelekseOpenMap()[childId];
  }

  isUkelekse(event: SchoolEvent): boolean {
    return event.title.toLowerCase().startsWith('ukelekse');
  }

  goToSkole() { this.router.navigate(['/skole']); }
  goToSettings() { this.router.navigate(['/innstillinger']); }

  formatTime(dateTime: string): string {
    try {
      return new Date(dateTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  formatSpanLabel(event: any): string {
    const gs = event as import('../../shared/services/google-calendar.service').GoogleCalendarEvent;
    const start = gs.spanStartTime ? gs.spanStart + ' ' + gs.spanStartTime : gs.spanStart ?? '';
    const end = gs.spanEndTime ? gs.spanEnd + ' ' + gs.spanEndTime : gs.spanEnd ?? '';
    const fmt = (s: string) => { const [d, t] = s.split(' '); return (d ? formatDateShort(d) : '') + (t ? ' ' + t : ''); };
    return fmt(start) + (end ? ' – ' + fmt(end) : '');
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

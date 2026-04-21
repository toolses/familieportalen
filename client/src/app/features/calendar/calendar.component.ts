import { Component, computed, inject, signal } from '@angular/core';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { ResidencyService } from '../../shared/services/residency.service';
import { GoogleCalendarService, GoogleCalendarEvent } from '../../shared/services/google-calendar.service';
import { SchoolEvent, SavedPlan } from '../school-plan/models/school-plan.models';
import { formatDateShort, dayName } from '../../shared/utils/date-utils';

type FilterMode = 'all' | 'homework' | 'reminders';

interface TaggedSchoolEvent extends SchoolEvent {
  childName: string;
  childColor: string;
}

interface CalendarDay {
  date: string;
  label: string;
  isToday: boolean;
  isWeekend: boolean;
  residency: 'Mamma' | 'Pappa' | null;
  schoolEvents: TaggedSchoolEvent[];
  googleEvents: GoogleCalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  template: `
    <div class="px-4 pt-2 pb-6 space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-800">Kalender</h2>
        @if (residency.todayResidency(); as label) {
          <div class="px-3 py-1.5 rounded-full text-sm font-semibold"
               [class]="label === 'Mamma'
                 ? 'bg-rose-100 text-rose-700'
                 : 'bg-blue-100 text-blue-700'">
            Hos {{ label }}
          </div>
        }
      </div>

      <!-- Week Navigation -->
      <div class="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
        <button (click)="prevWeek()"
                class="p-2 rounded-xl hover:bg-gray-100 active:scale-[0.95] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="flex items-center gap-2">
          <span class="font-semibold text-gray-800 text-sm">Uke {{ weekNumber() }}</span>
          <span class="text-gray-400 text-sm">{{ weekRangeLabel() }}</span>
        </div>
        <div class="flex items-center gap-1">
          @if (!isCurrentWeek()) {
            <button (click)="goToToday()"
                    class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:scale-[0.95] transition-all">
              I dag
            </button>
          }
          <button (click)="nextWeek()"
                  class="p-2 rounded-xl hover:bg-gray-100 active:scale-[0.95] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <!-- Filter -->
      <div class="flex gap-2">
        <button (click)="filter.set('all')"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                [class]="filter() === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'">
          Alle
        </button>
        <button (click)="filter.set('homework')"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                [class]="filter() === 'homework' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'">
          Lekser
        </button>
        <button (click)="filter.set('reminders')"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                [class]="filter() === 'reminders' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'">
          Påminnelser
        </button>
      </div>

      <!-- Day list -->
      <div class="space-y-1">
        @for (day of calendarDays(); track day.date) {
          <div class="sticky top-[57px] z-10">
            @if (day.residency) {
              <div class="h-1 mx-1 rounded-sm"
                   [class]="day.residency === 'Mamma' ? 'bg-rose-300' : 'bg-blue-300'"></div>
            }
            <div class="flex items-center gap-2 py-2 px-1 bg-gray-50"
                 [class.font-bold]="day.isToday"
                 [class.text-blue-700]="day.isToday"
                 [class.text-gray-600]="!day.isToday && !day.isWeekend"
                 [class.text-gray-400]="day.isWeekend">
              @if (day.isToday) {
                <span class="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
              }
              <span class="text-sm font-semibold">{{ day.label }}</span>
              @if (day.residency) {
                <span class="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      [class]="day.residency === 'Mamma' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'">
                  {{ day.residency }}
                </span>
              }
            </div>
          </div>

          <div class="space-y-2 pb-3">
            @if (day.schoolEvents.length === 0 && day.googleEvents.length === 0) {
              <div class="text-center py-3 text-gray-300 text-xs">
                Ingen hendelser
              </div>
            }

            @for (event of day.schoolEvents; track $index) {
              @if (event.category === 'reminder') {
                <div class="flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                    @if (event.description) {
                      <p class="text-xs text-gray-500 mt-0.5">{{ event.description }}</p>
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                  </div>
                  <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                </div>
              }
              @if (event.category === 'homework') {
                <div class="flex gap-3 items-start bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div class="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                    @if (event.description) {
                      <p class="text-xs text-gray-500 mt-0.5">{{ event.description }}</p>
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                  </div>
                  <span class="text-[10px] text-blue-600 font-medium bg-blue-100 px-1.5 py-0.5 rounded shrink-0">Lekse</span>
                </div>
              }
            }

            @for (event of day.googleEvents; track event.id) {
              <div class="flex gap-3 items-start bg-white border border-gray-200 rounded-xl p-3 shadow-xs"
                   style="border-left: 3px solid #4285F4;">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" class="shrink-0">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span class="font-medium text-gray-800 text-sm">{{ event.summary }}</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5">{{ formatEventTimeLabel(event) }}</p>
                  @if (event.description) {
                    <p class="text-xs text-gray-500 mt-0.5">{{ event.description }}</p>
                  }
                  @if (event.location) {
                    <p class="text-xs text-gray-400">{{ event.location }}</p>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `,
})
export class CalendarComponent {
  data = inject(SchoolDataService);
  residency = inject(ResidencyService);
  private google = inject(GoogleCalendarService);

  private get today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  filter = signal<FilterMode>('all');
  weekOffset = signal(0);

  private viewedMonday = computed(() => {
    const today = new Date(this.today + 'T00:00:00Z');
    const dayOfWeek = today.getUTCDay() || 7;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - dayOfWeek + 1 + this.weekOffset() * 7);
    return monday;
  });

  weekNumber = computed(() => this.getISOWeekNumber(this.viewedMonday()));

  weekRangeLabel = computed(() => {
    const monday = this.viewedMonday();
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return `${formatDateShort(monday.toISOString().slice(0, 10))} – ${formatDateShort(sunday.toISOString().slice(0, 10))}`;
  });

  isCurrentWeek = computed(() => this.weekOffset() === 0);

  private weekDates = computed(() => {
    const monday = this.viewedMonday();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  });

  calendarDays = computed<CalendarDay[]>(() => {
    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const googleEvents = this.google.events();
    const filterMode = this.filter();

    // Collect events from all children, tagged with child info
    const allTagged: TaggedSchoolEvent[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan: SavedPlan | null = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!plan) continue;
      for (const e of plan.events) {
        if (
          e.category !== 'school_class' &&
          e.category !== 'information' &&
          !this.isUkelekse(e)
        ) {
          allTagged.push({ ...e, childName: child.name, childColor: child.color });
        }
      }
    }

    return this.weekDates().map((date) => {
      const isWeekend = this.isWeekendDate(date);
      let schoolEventsForDay = allTagged.filter((e) => e.date === date);

      if (filterMode === 'homework') {
        schoolEventsForDay = schoolEventsForDay.filter((e) => e.category === 'homework');
      } else if (filterMode === 'reminders') {
        schoolEventsForDay = schoolEventsForDay.filter((e) => e.category === 'reminder');
      }

      const googleForDay = filterMode === 'all'
        ? googleEvents.filter((e) => e.date === date)
        : [];

      return {
        date,
        label: this.capitalize(dayName(date)) + ' ' + formatDateShort(date),
        isToday: date === this.today,
        isWeekend,
        residency: this.residency.residencyForDate(date),
        schoolEvents: schoolEventsForDay,
        googleEvents: googleForDay,
      };
    });
  });

  prevWeek(): void { this.weekOffset.update((o) => o - 1); this.refreshGoogleForWeek(); }
  nextWeek(): void { this.weekOffset.update((o) => o + 1); this.refreshGoogleForWeek(); }
  goToToday(): void { this.weekOffset.set(0); this.refreshGoogleForWeek(); }

  isUkelekse(event: SchoolEvent): boolean {
    const title = event.title.toLowerCase();
    return title.startsWith('ukelekse') || title.includes('hele uken');
  }

  formatEventTimeLabel(event: GoogleCalendarEvent): string {
    if (event.startTime) {
      return `${event.startTime}${event.endTime ? ' – ' + event.endTime : ''}`;
    }
    if (event.spanStart && event.spanEnd && event.spanStart !== event.spanEnd) {
      return `${formatDateShort(event.spanStart)} – ${formatDateShort(event.spanEnd)}`;
    }
    return 'Hele dagen';
  }

  formatTime(dateTime: string): string {
    try {
      return new Date(dateTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  private refreshGoogleForWeek(): void {
    const calId = this.google.selectedCalendarId();
    if (!calId) return;
    const monday = this.viewedMonday();
    const start = new Date(monday.getTime());
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(monday.getTime());
    end.setUTCDate(monday.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    this.google.fetchEventsForRange(calId, start, end);
  }

  private isWeekendDate(date: string): boolean {
    const day = new Date(date + 'T00:00:00Z').getUTCDay();
    return day === 0 || day === 6;
  }

  private getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

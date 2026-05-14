import { Component, computed, inject, signal } from '@angular/core';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { ResidencyService } from '../../shared/services/residency.service';
import { GoogleCalendarService, GoogleCalendarEvent } from '../../shared/services/google-calendar.service';
import { SchoolEvent, SavedPlan, ManualReminder, ManualCalendarEvent, AssignedTo } from '../school-plan/models/school-plan.models';
import { formatDateShort, dayName } from '../../shared/utils/date-utils';
import { SwipeDirective } from '../../shared/directives/swipe.directive';
import { EventEditSheetComponent, WeekDayOption } from '../../shared/components/event-edit-sheet.component';
import { ReminderSheetComponent } from '../../shared/components/reminder-sheet.component';
import { CalendarEventSheetComponent } from '../../shared/components/calendar-event-sheet.component';
import { HomeworkItemComponent } from '../../shared/components/homework-item.component';

type FilterMode = 'all' | 'homework' | 'reminders' | 'events';
type ViewMode = 'week' | 'month';

interface TaggedSchoolEvent extends SchoolEvent {
  childName: string;
  childColor: string;
  childId: string;
  _original: SchoolEvent;
}

interface CalendarDay {
  date: string;
  label: string;
  isToday: boolean;
  isWeekend: boolean;
  residency: 'Mamma' | 'Pappa' | null;
  schoolEvents: TaggedSchoolEvent[];
  googleEvents: GoogleCalendarEvent[];
  manualReminders: ManualReminder[];
  manualEvents: { event: ManualCalendarEvent; isFirstDay: boolean }[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [SwipeDirective, EventEditSheetComponent, ReminderSheetComponent, CalendarEventSheetComponent, HomeworkItemComponent],
  template: `
    <div class="px-4 pt-2 pb-4 space-y-3" appSwipe
         (swipeLeft)="viewMode() === 'week' ? nextWeek() : nextMonth()"
         (swipeRight)="viewMode() === 'week' ? prevWeek() : prevMonth()">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-800">Kalender</h2>
        <!-- View toggle -->
        <div class="flex bg-gray-100 rounded-xl p-0.5">
          <button (click)="viewMode.set('week')"
                  class="px-3 py-1 text-xs font-medium rounded-lg transition-all"
                  [class]="viewMode() === 'week' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'">
            Uke
          </button>
          <button (click)="viewMode.set('month'); selectedMonthDate.set(today)"
                  class="px-3 py-1 text-xs font-medium rounded-lg transition-all"
                  [class]="viewMode() === 'month' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'">
            Måned
          </button>
        </div>
      </div>

      @if (viewMode() === 'week') {
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
        <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          <button (click)="filter.set('all')"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
                  [class]="filter() === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'">
            Alle
          </button>
          <button (click)="filter.set('homework')"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
                  [class]="filter() === 'homework' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'">
            Lekser
          </button>
          <button (click)="filter.set('reminders')"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
                  [class]="filter() === 'reminders' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'">
            Påminnelser
          </button>
          <button (click)="filter.set('events')"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
                  [class]="filter() === 'events' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'">
            Hendelser
          </button>
        </div>
      } @else {
        <!-- Month Navigation -->
        <div class="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
          <button (click)="prevMonth()"
                  class="p-2 rounded-xl hover:bg-gray-100 active:scale-[0.95] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-800 text-sm capitalize">{{ monthLabel() }}</span>
          </div>
          <div class="flex items-center gap-1">
            @if (monthOffset() !== 0) {
              <button (click)="goToTodayMonth()"
                      class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:scale-[0.95] transition-all">
                I dag
              </button>
            }
            <button (click)="nextMonth()"
                    class="p-2 rounded-xl hover:bg-gray-100 active:scale-[0.95] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- Month grid -->
        <div class="bg-white rounded-2xl p-4 shadow-sm">
          <!-- Day-of-week headers -->
          <div class="grid grid-cols-7 mb-2">
            @for (h of ['Ma','Ti','On','To','Fr','Lø','Sø']; track h) {
              <div class="text-center text-[10px] font-semibold text-gray-400">{{ h }}</div>
            }
          </div>
          <!-- Day cells -->
          <div class="grid grid-cols-7 gap-y-1">
            @for (cell of monthGridCells(); track cell.date ?? $index) {
              @if (cell.date) {
                <button (click)="selectMonthDay(cell.date)"
                        class="flex flex-col items-center py-1 rounded-xl transition-all active:scale-95"
                        [class]="cell.isToday
                          ? 'bg-blue-600 text-white'
                          : selectedMonthDate() === cell.date
                            ? 'bg-gray-800 text-white'
                            : cell.isCurrentMonth
                              ? 'text-gray-800'
                              : 'text-gray-300'">
                  <span class="text-xs font-medium leading-tight">{{ cell.dayNumber }}</span>
                  <!-- Event dots -->
                  <div class="flex gap-0.5 mt-0.5 h-1.5 items-center justify-center">
                    @for (dot of cell.dots; track $index) {
                      <span class="w-1 h-1 rounded-full shrink-0"
                            [style.background]="cell.isToday ? 'white' : dot"></span>
                    }
                  </div>
                  <!-- Residency bar -->
                  @if (cell.residency) {
                    <span class="w-3 h-0.5 rounded-full mt-0.5"
                          [class]="cell.residency === 'Mamma' ? 'bg-rose-300' : 'bg-blue-300'"
                          [class.hidden]="cell.isToday"></span>
                  }
                </button>
              } @else {
                <div></div>
              }
            }
          </div>
        </div>

        <!-- Selected day events -->
        @if (selectedMonthDayData(); as day) {
          <div class="space-y-2">
            <div class="flex items-center gap-2 pt-1 px-1">
              @if (day.residency) {
                <span class="w-2 h-2 rounded-full shrink-0"
                      [class]="day.residency === 'Mamma' ? 'bg-rose-400' : 'bg-blue-400'"></span>
              }
              <span class="text-sm font-semibold text-gray-800">{{ day.label }}</span>
              @if (day.residency) {
                <span class="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      [class]="day.residency === 'Mamma' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'">
                  {{ day.residency }}
                </span>
              }
            </div>

            @if (day.schoolEvents.length === 0 && day.googleEvents.length === 0 && day.manualReminders.length === 0 && day.manualEvents.length === 0) {
              <div class="text-center py-4 text-gray-300 text-xs">
                Ingen hendelser denne dagen
              </div>
            }

            <!-- Påminnelser fra skoleplan -->
            @for (event of day.schoolEvents; track $index) {
              @if (event.category === 'reminder') {
                <button (click)="openEditEvent(event)"
                        class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                  <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                    @if (event.description) {
                      <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                  </div>
                  <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                </button>
              }
            }

            @for (reminder of day.manualReminders; track reminder.id) {
              <button (click)="openEditReminder(reminder)"
                      class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                <div class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                     [style.background]="getAssignedColor(reminder.assignedTo)"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-800 text-sm">{{ reminder.title }}</span>
                    @if (reminder.time) {
                      <span class="text-[10px] text-gray-400">{{ reminder.time }}</span>
                    }
                  </div>
                  @if (reminder.description) {
                    <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ reminder.description }}</p>
                  }
                  <div class="flex items-center gap-2 mt-1">
                    <p class="text-[10px] font-semibold" [style.color]="getAssignedColor(reminder.assignedTo)">
                      {{ getAssignedLabel(reminder.assignedTo) }}
                    </p>
                    @if (reminder.recurrence) {
                      <span class="text-[10px] text-gray-400">
                        @if (reminder.recurrence.type === 'weekly') { Hver uke } @else { Annenhver uke }
                      </span>
                    }
                    @if (reminder.isSchoolRelated) {
                      <span class="text-[10px] text-indigo-500 font-medium">Skole</span>
                    }
                  </div>
                </div>
                <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
              </button>
            }

            <!-- Lekser -->
            @for (event of day.schoolEvents; track $index) {
              @if (event.category === 'homework') {
                <app-homework-item
                  [event]="event"
                  [childName]="event.childName"
                  [childColor]="event.childColor"
                  (edit)="openEditEvent(event)" />
              }
            }

            <!-- Manuelle hendelser -->
            @for (item of day.manualEvents; track item.event.id) {
              <button (click)="openEditCalendarEvent(item.event)"
                      class="w-full flex gap-3 items-start bg-indigo-50 rounded-xl p-3 text-left active:bg-indigo-100 transition-colors"
                      [style.border-left]="'3px solid ' + getAssignedColor(item.event.assignedTo)">
                <div class="flex-1 min-w-0">
                  <span class="font-medium text-gray-800 text-sm">{{ item.event.title }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ formatManualEventTimeLabel(item.event) }}</p>
                  @if (item.event.description) {
                    <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ item.event.description }}</p>
                  }
                  <div class="flex items-center gap-2 mt-1">
                    <p class="text-[10px] font-semibold" [style.color]="getAssignedColor(item.event.assignedTo)">
                      {{ getAssignedLabel(item.event.assignedTo) }}
                    </p>
                    @if (item.event.recurrence) {
                      <span class="text-[10px] text-gray-400">
                        @if (item.event.recurrence.type === 'weekly') { Hver uke } @else { Annenhver uke }
                      </span>
                    }
                  </div>
                </div>
                <span class="text-[10px] text-indigo-600 font-medium bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">Hendelse</span>
              </button>
            }

            <!-- Google Calendar hendelser -->
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
                    <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                  }
                  @if (event.location) {
                    <p class="text-xs text-gray-400">{{ event.location }}</p>
                  }
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Day list -->
      @if (viewMode() === 'week') {
      <div class="space-y-1">
        @for (day of calendarDays(); track day.date) {
          <div class="sticky top-0 z-10">
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
            @if (day.schoolEvents.length === 0 && day.googleEvents.length === 0 && day.manualReminders.length === 0 && day.manualEvents.length === 0) {
              <div class="text-center py-3 text-gray-300 text-xs">
                Ingen hendelser
              </div>
            }

            <!-- Alle påminnelser (skole + manuelle) -->
            @for (event of day.schoolEvents; track $index) {
              @if (event.category === 'reminder') {
                <button (click)="openEditEvent(event)"
                        class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                  <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                    @if (event.description) {
                      <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                  </div>
                  <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                </button>
              }
            }

            @for (reminder of day.manualReminders; track reminder.id) {
              <button (click)="openEditReminder(reminder)"
                      class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                <div class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                     [style.background]="getAssignedColor(reminder.assignedTo)"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-800 text-sm">{{ reminder.title }}</span>
                    @if (reminder.time) {
                      <span class="text-[10px] text-gray-400">{{ reminder.time }}</span>
                    }
                  </div>
                  @if (reminder.description) {
                    <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ reminder.description }}</p>
                  }
                  <div class="flex items-center gap-2 mt-1">
                    <p class="text-[10px] font-semibold" [style.color]="getAssignedColor(reminder.assignedTo)">
                      {{ getAssignedLabel(reminder.assignedTo) }}
                    </p>
                    @if (reminder.recurrence) {
                      <span class="text-[10px] text-gray-400">
                        @if (reminder.recurrence.type === 'weekly') { Hver uke } @else { Annenhver uke }
                      </span>
                    }
                    @if (reminder.isSchoolRelated) {
                      <span class="text-[10px] text-indigo-500 font-medium">Skole</span>
                    }
                  </div>
                </div>
                <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
              </button>
            }

            <!-- Lekser -->
            @for (event of day.schoolEvents; track $index) {
              @if (event.category === 'homework') {
                <app-homework-item
                  [event]="event"
                  [childName]="event.childName"
                  [childColor]="event.childColor"
                  (edit)="openEditEvent(event)" />
              }
            }

            <!-- Manuelle hendelser -->
            @for (item of day.manualEvents; track item.event.id) {
              <button (click)="openEditCalendarEvent(item.event)"
                      class="w-full flex gap-3 items-start bg-indigo-50 rounded-xl p-3 text-left active:bg-indigo-100 transition-colors"
                      [style.border-left]="'3px solid ' + getAssignedColor(item.event.assignedTo)">
                <div class="flex-1 min-w-0">
                  <span class="font-medium text-gray-800 text-sm">{{ item.event.title }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ formatManualEventTimeLabel(item.event) }}</p>
                  @if (item.event.description) {
                    <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ item.event.description }}</p>
                  }
                  <div class="flex items-center gap-2 mt-1">
                    <p class="text-[10px] font-semibold" [style.color]="getAssignedColor(item.event.assignedTo)">
                      {{ getAssignedLabel(item.event.assignedTo) }}
                    </p>
                    @if (item.event.recurrence) {
                      <span class="text-[10px] text-gray-400">
                        @if (item.event.recurrence.type === 'weekly') { Hver uke } @else { Annenhver uke }
                      </span>
                    }
                  </div>
                </div>
                <span class="text-[10px] text-indigo-600 font-medium bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">Hendelse</span>
              </button>
            }

            <!-- Google Calendar hendelser -->
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
                    <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
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
      } <!-- end @if week view -->
    </div>

    <!-- FAB: Legg til -->
    @if (!showNewItemMenu() && !editingEvent() && editingReminder() === undefined && editingCalendarEvent() === undefined && !showNewReminderSheet() && !showNewCalendarEventSheet()) {
      <button (click)="showNewItemMenu.set(true)"
              class="fixed bottom-25 right-4 z-40 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:bg-indigo-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
      </button>
    }

    <!-- Meny: velg type nytt element -->
    @if (showNewItemMenu()) {
      <div class="fixed inset-0 z-50 flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="showNewItemMenu.set(false)"></div>
        <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-15 shadow-2xl space-y-3 modal-sheet">
          <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2"></div>
          <h3 class="text-base font-bold text-gray-900 text-center">Hva vil du legge til?</h3>
          <button (click)="openNewReminder()"
                  class="w-full flex items-center gap-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 active:bg-amber-100 transition-colors text-left">
            <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <p class="font-semibold text-gray-800 text-sm">Påminnelse</p>
              <p class="text-xs text-gray-500 mt-0.5">Enkel påminnelse med valgfri gjentagelse</p>
            </div>
          </button>
          <button (click)="openNewCalendarEvent()"
                  class="w-full flex items-center gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 active:bg-indigo-100 transition-colors text-left">
            <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            <div>
              <p class="font-semibold text-gray-800 text-sm">Hendelse</p>
              <p class="text-xs text-gray-500 mt-0.5">Kalenderhendelse med dato og klokkeslett</p>
            </div>
          </button>
          <button (click)="showNewItemMenu.set(false)"
                  class="w-full py-3 rounded-xl font-medium text-sm text-gray-500 active:scale-[0.98] transition-all">
            Avbryt
          </button>
        </div>
      </div>
    }

    <!-- Rediger skole-hendelse -->
    @if (editingEvent()) {
      <app-event-edit-sheet
        [event]="editingEvent()!"
        [weekDays]="weekDayOptions()"
        (saved)="onEventSaved($event)"
        (deleted)="onEventDeleted()"
        (cancelled)="editingEvent.set(null)" />
    }

    <!-- Ny / rediger påminnelse -->
    @if (showNewReminderSheet() || editingReminder() !== undefined) {
      <app-reminder-sheet
        [reminder]="editingReminder() ?? null"
        [defaultDate]="selectedDate()"
        (saved)="onReminderSaved($event)"
        (deleted)="onReminderDeleted()"
        (cancelled)="closeReminderSheet()" />
    }

    <!-- Ny / rediger hendelse -->
    @if (showNewCalendarEventSheet() || editingCalendarEvent() !== undefined) {
      <app-calendar-event-sheet
        [event]="editingCalendarEvent() ?? null"
        [defaultDate]="selectedDate()"
        (saved)="onCalendarEventSaved($event)"
        (deleted)="onCalendarEventDeleted()"
        (cancelled)="closeCalendarEventSheet()" />
    }
  `,
  styles: `
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 1.25rem); }
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .modal-sheet { animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
  `,
})
export class CalendarComponent {
  data = inject(SchoolDataService);
  residency = inject(ResidencyService);
  private google = inject(GoogleCalendarService);

  // ── Editing / sheet state ──────────────────────────────────
  editingEvent = signal<TaggedSchoolEvent | null>(null);
  editingReminder = signal<ManualReminder | undefined>(undefined);
  editingCalendarEvent = signal<ManualCalendarEvent | undefined>(undefined);
  showNewItemMenu = signal(false);
  showNewReminderSheet = signal(false);
  showNewCalendarEventSheet = signal(false);
  selectedDate = signal('');

  weekDayOptions = computed<WeekDayOption[]>(() =>
    this.weekDates().map((date) => ({
      date,
      label: this.capitalize(dayName(date)) + ' ' + formatDateShort(date),
    }))
  );

  get today(): string {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  filter = signal<FilterMode>('all');
  viewMode = signal<ViewMode>('week');
  weekOffset = signal(0);
  monthOffset = signal(0);

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

  private weekDates = computed<string[]>(() => {
    const monday = this.viewedMonday();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  });

  // ── Month view ─────────────────────────────────────────────
  private viewedMonth = computed(() => {
    const today = new Date(this.today + 'T00:00:00Z');
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + this.monthOffset(), 1));
  });

  monthLabel = computed(() => {
    const d = this.viewedMonth();
    const names = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
    return names[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  });

  monthGridCells = computed<{ date: string; dayNumber: number; isToday: boolean; isCurrentMonth: boolean; residency: 'Mamma' | 'Pappa' | null; dots: string[] }[]>(() => {
    const start = this.viewedMonth();
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const firstDow = (start.getUTCDay() || 7) - 1; // 0=Mon

    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const reminders = this.data.manualReminders();
    const calEvents = this.data.calendarEvents();
    const googleEvents = this.google.events();
    const personalEvents = this.google.personalEvents();

    const allTagged: TaggedSchoolEvent[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan: SavedPlan | null = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!plan) continue;
      for (const e of plan.events) {
        if (e.category !== 'school_class' && e.category !== 'information' && e.category !== 'weekly_homework') {
          allTagged.push({ ...e, childName: child.name, childColor: child.color, childId: child.id, _original: e });
        }
      }
    }

    const cells: { date: string; dayNumber: number; isToday: boolean; isCurrentMonth: boolean; residency: 'Mamma' | 'Pappa' | null; dots: string[] }[] = [];

    // Padding cells before first day
    for (let i = 0; i < firstDow; i++) {
      cells.push({ date: '', dayNumber: 0, isToday: false, isCurrentMonth: false, residency: null, dots: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dots: string[] = [];

      const schoolEvts = allTagged.filter((e) => e.date === date);
      for (const e of schoolEvts) {
        if (dots.length < 3) dots.push(e.childColor);
      }
      const hasReminder = reminders.some((r) => this.reminderOccursOnDate(r, date));
      if (hasReminder && dots.length < 3) dots.push('#F59E0B');
      const hasCalEvt = calEvents.some((e) => this.calendarEventOccursOnDate(e, date));
      if (hasCalEvt && dots.length < 3) dots.push('#6366F1');
      const hasGoogle = googleEvents.some((e) => e.date === date);
      if (hasGoogle && dots.length < 3) dots.push('#4285F4');
      const hasPersonal = personalEvents.some((e) => e.date === date);
      if (hasPersonal && dots.length < 3) dots.push('#8B5CF6');

      cells.push({
        date,
        dayNumber: d,
        isToday: date === this.today,
        isCurrentMonth: true,
        residency: this.residency.residencyForDate(date),
        dots,
      });
    }

    return cells;
  });

  selectedMonthDate = signal<string>(this.today);

  selectedMonthDayData = computed<CalendarDay | null>(() => {
    const date = this.selectedMonthDate();
    if (!date) return null;
    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const googleEvents = [...this.google.events(), ...this.google.personalEvents()];
    const reminders = this.data.manualReminders();
    const calEvents = this.data.calendarEvents();

    const allTagged: TaggedSchoolEvent[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan: SavedPlan | null = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!plan) continue;
      for (const e of plan.events) {
        if (e.category !== 'school_class' && e.category !== 'information' && e.category !== 'weekly_homework') {
          allTagged.push({ ...e, childName: child.name, childColor: child.color, childId: child.id, _original: e });
        }
      }
    }

    return {
      date,
      label: this.capitalize(dayName(date)) + ' ' + formatDateShort(date),
      isToday: date === this.today,
      isWeekend: this.isWeekendDate(date),
      residency: this.residency.residencyForDate(date),
      schoolEvents: allTagged.filter((e) => e.date === date),
      googleEvents: googleEvents.filter((e) => e.date === date),
      manualReminders: reminders.filter((r) => this.reminderOccursOnDate(r, date)),
      manualEvents: calEvents
        .filter((e) => this.calendarEventOccursOnDate(e, date))
        .map((e) => ({ event: e, isFirstDay: this.isFirstDayOfOccurrence(e, date) })),
    };
  });

  prevMonth(): void { this.monthOffset.update((o) => o - 1); this.selectedMonthDate.set(''); }
  nextMonth(): void { this.monthOffset.update((o) => o + 1); this.selectedMonthDate.set(''); }
  goToTodayMonth(): void { this.monthOffset.set(0); this.selectedMonthDate.set(this.today); }

  selectMonthDay(date: string): void {
    this.selectedMonthDate.set(date);
  }


  calendarDays = computed<CalendarDay[]>(() => {
    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const googleEvents = [...this.google.events(), ...this.google.personalEvents()];
    const filterMode = this.filter();
    const reminders = this.data.manualReminders();
    const calEvents = this.data.calendarEvents();

    const allTagged: TaggedSchoolEvent[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan: SavedPlan | null = plans.length > 0 ? plans[plans.length - 1] : null;
      if (!plan) continue;
      for (const e of plan.events) {
        if (e.category !== 'school_class' && e.category !== 'information' && e.category !== 'weekly_homework') {
          allTagged.push({ ...e, childName: child.name, childColor: child.color, childId: child.id, _original: e });
        }
      }
    }

    return this.weekDates().map((date) => {
      const isWeekend = this.isWeekendDate(date);

      let schoolEventsForDay = allTagged.filter((e) => e.date === date);
      if (filterMode === 'homework') {
        schoolEventsForDay = schoolEventsForDay.filter((e) => e.category === 'homework' || e.category === 'weekly_homework');
      } else if (filterMode === 'reminders') {
        schoolEventsForDay = schoolEventsForDay.filter((e) => e.category === 'reminder');
      } else if (filterMode === 'events') {
        schoolEventsForDay = [];
      }

      const manualRemindersForDay: ManualReminder[] = (filterMode === 'all' || filterMode === 'reminders')
        ? reminders.filter((r) => this.reminderOccursOnDate(r, date))
        : [];

      const manualEventsForDay: { event: ManualCalendarEvent; isFirstDay: boolean }[] =
        (filterMode === 'all' || filterMode === 'events')
          ? calEvents
              .filter((e) => this.calendarEventOccursOnDate(e, date))
              .map((e) => ({ event: e, isFirstDay: this.isFirstDayOfOccurrence(e, date) }))
          : [];

      const googleForDay: GoogleCalendarEvent[] = filterMode === 'all'
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
        manualReminders: manualRemindersForDay,
        manualEvents: manualEventsForDay,
      };
    });
  });

  prevWeek(): void { this.weekOffset.update((o) => o - 1); this.refreshGoogleForWeek(); this.refreshPersonalGoogleForWeek(); }
  nextWeek(): void { this.weekOffset.update((o) => o + 1); this.refreshGoogleForWeek(); this.refreshPersonalGoogleForWeek(); }
  goToToday(): void { this.weekOffset.set(0); this.refreshGoogleForWeek(); this.refreshPersonalGoogleForWeek(); }

  // ── School event editing ───────────────────────────────────
  openEditEvent(event: TaggedSchoolEvent): void { this.editingEvent.set(event); }

  onEventSaved(updated: SchoolEvent): void {
    const original = this.editingEvent();
    if (!original) return;
    this.data.updateEventInPlan(original.childId, original._original, updated);
    this.editingEvent.set(null);
  }

  onEventDeleted(): void {
    const original = this.editingEvent();
    if (!original) return;
    this.data.deleteEventFromPlan(original.childId, original._original);
    this.editingEvent.set(null);
  }

  // ── Manual reminder sheet ─────────────────────────────────
  openNewReminder(): void {
    this.showNewItemMenu.set(false);
    this.editingReminder.set(undefined);
    this.showNewReminderSheet.set(true);
  }

  openEditReminder(reminder: ManualReminder): void {
    this.showNewReminderSheet.set(false);
    this.editingReminder.set(reminder);
  }

  onReminderSaved(payload: Omit<ManualReminder, 'id' | 'createdAt'>): void {
    const editing = this.editingReminder();
    if (editing) {
      this.data.updateManualReminder(editing.id, payload);
    } else {
      this.data.addManualReminder(payload);
    }
    this.closeReminderSheet();
  }

  onReminderDeleted(): void {
    const editing = this.editingReminder();
    if (editing) this.data.deleteManualReminder(editing.id);
    this.closeReminderSheet();
  }

  closeReminderSheet(): void {
    this.editingReminder.set(undefined);
    this.showNewReminderSheet.set(false);
  }

  // ── Manual calendar event sheet ───────────────────────────
  openNewCalendarEvent(): void {
    this.showNewItemMenu.set(false);
    this.editingCalendarEvent.set(undefined);
    this.showNewCalendarEventSheet.set(true);
  }

  openEditCalendarEvent(event: ManualCalendarEvent): void {
    this.showNewCalendarEventSheet.set(false);
    this.editingCalendarEvent.set(event);
  }

  onCalendarEventSaved(payload: Omit<ManualCalendarEvent, 'id' | 'createdAt'>): void {
    const editing = this.editingCalendarEvent();
    if (editing) {
      this.data.updateCalendarEvent(editing.id, payload);
    } else {
      this.data.addCalendarEvent(payload);
    }
    this.closeCalendarEventSheet();
  }

  onCalendarEventDeleted(): void {
    const editing = this.editingCalendarEvent();
    if (editing) this.data.deleteCalendarEvent(editing.id);
    this.closeCalendarEventSheet();
  }

  closeCalendarEventSheet(): void {
    this.editingCalendarEvent.set(undefined);
    this.showNewCalendarEventSheet.set(false);
  }

  // ── Assigned label helpers ────────────────────────────────
  getAssignedLabel(assignedTo: AssignedTo[]): string {
    return assignedTo.map((a) => {
      if (a.type === 'parent') return a.role;
      const child = this.data.children().find((c) => c.id === a.childId);
      return child?.name ?? 'Ukjent';
    }).join(' · ');
  }

  getAssignedColor(assignedTo: AssignedTo[]): string {
    const first = assignedTo[0];
    if (!first) return '#6B7280';
    if (first.type === 'parent') return first.role === 'Mamma' ? '#F43F5E' : '#3B82F6';
    const child = this.data.children().find((c) => c.id === first.childId);
    return child?.color ?? '#6B7280';
  }

  // ── Time label helpers ────────────────────────────────────
  formatManualEventTimeLabel(event: ManualCalendarEvent): string {
    if (event.isAllDay) {
      if (event.startDate === event.endDate) return 'Hele dagen';
      return `Hele dagen · ${formatDateShort(event.startDate)} – ${formatDateShort(event.endDate)}`;
    }
    if (event.startDate !== event.endDate) {
      const start = `${formatDateShort(event.startDate)}${event.startTime ? ' ' + event.startTime : ''}`;
      const end = `${formatDateShort(event.endDate)}${event.endTime ? ' ' + event.endTime : ''}`;
      return `${start} – ${end}`;
    }
    const start = event.startTime ?? '';
    const end = event.endTime ? ` – ${event.endTime}` : '';
    return start + end;
  }

  formatEventTimeLabel(event: GoogleCalendarEvent): string {
    if (event.spanStart && event.spanEnd && event.spanStart !== event.spanEnd && event.spanStartTime) {
      const start = `${formatDateShort(event.spanStart)} ${event.spanStartTime}`;
      const end = event.spanEndTime ? ` – ${formatDateShort(event.spanEnd)} ${event.spanEndTime}` : '';
      return start + end;
    }
    if (event.startTime) {
      return `${event.startTime}${event.endTime ? ' – ' + event.endTime : ''}`;
    }
    return 'Hele dagen';
  }

  // ── Recurrence helpers ────────────────────────────────────
  private reminderOccursOnDate(reminder: ManualReminder, date: string): boolean {
    if (!reminder.recurrence) return reminder.date === date;
    const startMs = new Date(reminder.date + 'T00:00:00Z').getTime();
    const checkMs = new Date(date + 'T00:00:00Z').getTime();
    if (checkMs < startMs) return false;
    // Must be same day of week
    if (new Date(reminder.date + 'T00:00:00Z').getUTCDay() !== new Date(date + 'T00:00:00Z').getUTCDay()) return false;
    const diffWeeks = Math.round((checkMs - startMs) / (7 * 24 * 60 * 60 * 1000));
    if (reminder.recurrence.type === 'weekly') return true;
    return diffWeeks % 2 === 0;
  }

  private calendarEventOccursOnDate(event: ManualCalendarEvent, date: string): boolean {
    const startMs = new Date(event.startDate + 'T00:00:00Z').getTime();
    const checkMs = new Date(date + 'T00:00:00Z').getTime();
    if (checkMs < startMs) return false;
    const durationDays = Math.round(
      (new Date(event.endDate + 'T00:00:00Z').getTime() - startMs) / (24 * 60 * 60 * 1000)
    );
    if (!event.recurrence) {
      return event.startDate <= date && date <= event.endDate;
    }
    const intervalDays = event.recurrence.type === 'weekly' ? 7 : 14;
    const diffDays = Math.round((checkMs - startMs) / (24 * 60 * 60 * 1000));
    const offsetInCycle = diffDays % intervalDays;
    return offsetInCycle <= durationDays;
  }

  private isFirstDayOfOccurrence(event: ManualCalendarEvent, date: string): boolean {
    if (!event.recurrence) return date === event.startDate;
    const startMs = new Date(event.startDate + 'T00:00:00Z').getTime();
    const checkMs = new Date(date + 'T00:00:00Z').getTime();
    const intervalDays = event.recurrence.type === 'weekly' ? 7 : 14;
    const diffDays = Math.round((checkMs - startMs) / (24 * 60 * 60 * 1000));
    return diffDays % intervalDays === 0;
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

  private refreshPersonalGoogleForWeek(): void {
    const calId = this.google.personalSelectedCalendarId();
    if (!calId) return;
    const monday = this.viewedMonday();
    const start = new Date(monday.getTime());
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(monday.getTime());
    end.setUTCDate(monday.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    this.google.fetchPersonalEventsForRange(calId, start, end);
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

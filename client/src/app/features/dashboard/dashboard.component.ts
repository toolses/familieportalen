import { Component, computed, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { ResidencyService } from '../../shared/services/residency.service';
import { GoogleCalendarService, GoogleCalendarEvent } from '../../shared/services/google-calendar.service';
import { SchoolEvent, Child, ManualReminder, ManualCalendarEvent, AssignedTo } from '../school-plan/models/school-plan.models';
import { formatDateShort, dayName, getISOWeekYear } from '../../shared/utils/date-utils';
import { SwipeDirective } from '../../shared/directives/swipe.directive';
import { EventEditSheetComponent } from '../../shared/components/event-edit-sheet.component';
import { ReminderSheetComponent } from '../../shared/components/reminder-sheet.component';
import { CalendarEventSheetComponent } from '../../shared/components/calendar-event-sheet.component';
import { HomeworkItemComponent } from '../../shared/components/homework-item.component';

const ACTION_KEYWORDS = ['husk', 'ta med', 'matpakke', 'penger', 'utstyr', 'lade', 'sekk', 'tursekk', 'gymtøy', 'gymsko', 'badetøy', 'skiftetøy', 'turklær', 'gymtøy'];

interface TaggedEvent extends SchoolEvent {
  childName: string;
  childColor: string;
  childId: string;
  planRef: SchoolEvent;
}

interface ChildUkelekser {
  child: Child;
  events: SchoolEvent[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SlicePipe, SwipeDirective, RouterLink, EventEditSheetComponent, ReminderSheetComponent, CalendarEventSheetComponent, HomeworkItemComponent],
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

        <!-- Byttedag-varsel -->
        @if (isSwitchDayTomorrow()) {
          <a routerLink="/lister/bytte-hus"
             class="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 shadow-lg shadow-purple-200 active:scale-[0.98] transition-all">
            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0 text-xl">🔄</div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-white text-sm">{{ switchDayAlert().label }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-80 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        }

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

        @if (allTodayEvents().length === 0 && todayGoogleEvents().length === 0 && allUkelekser().length === 0 && tomorrowReminders().length === 0 && tomorrowManualReminders().length === 0 && todayManualReminders().length === 0 && todayManualEvents().length === 0) {
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

          <!-- Husk i dag! -->
          @if (quickActions().length > 0 || todayManualReminders().length > 0) {
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Husk i dag!</h3>
              @for (event of quickActions(); track $index) {
                <button (click)="openEditEvent(event)" class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                  <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                    @if (event.description) {
                      @let evtExp = isExpanded(event.childId + event.date + event.title);
                      @let evtLong = event.description.length > 150;
                      <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ evtLong && !evtExp ? (event.description | slice:0:150) + '…' : event.description }}</p>
                      @if (evtLong) {
                        <span (click)="$event.stopPropagation(); toggleExpand(event.childId + event.date + event.title)"
                              class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ evtExp ? 'Vis mindre' : 'Vis mer' }}</span>
                      }
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                  </div>
                  <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                </button>
              }
              @for (reminder of todayManualReminders(); track reminder.id) {
                <button (click)="openEditReminder(reminder)" class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                  <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="getAssignedColor(reminder.assignedTo)"></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-gray-800 text-sm">{{ reminder.title }}</span>
                      @if (reminder.time) {
                        <span class="text-[10px] text-gray-400">{{ reminder.time }}</span>
                      }
                    </div>
                    @if (reminder.description) {
                      @let remExp = isExpanded('rem-' + reminder.id);
                      @let remLong = reminder.description.length > 150;
                      <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ remLong && !remExp ? (reminder.description | slice:0:150) + '…' : reminder.description }}</p>
                      @if (remLong) {
                        <span (click)="$event.stopPropagation(); toggleExpand('rem-' + reminder.id)"
                              class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ remExp ? 'Vis mindre' : 'Vis mer' }}</span>
                      }
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="getAssignedColor(reminder.assignedTo)">
                      {{ getAssignedLabel(reminder.assignedTo) }}
                    </p>
                  </div>
                  <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                </button>
              }
            </div>
          }

          <!-- Google Calendar -->
          @if (todayGoogleEvents().length > 0) {
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Google Kalender</h3>
              @for (event of todayGoogleEvents(); track event.id) {
                <div class="flex gap-3 items-start bg-white border border-gray-200 rounded-xl p-3 shadow-xs"
                     [style.border-left]="'3px solid ' + event.color">
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
                      @let expanded = isExpanded(event.id + event.date);
                      @let long = event.description.length > 150;
                      <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ long && !expanded ? (event.description | slice:0:200) + '…' : event.description }}</p>
                      @if (long) {
                        <button (click)="toggleExpand(event.id + event.date)"
                                class="text-xs text-blue-500 font-medium mt-0.5">
                          {{ expanded ? 'Vis mindre' : 'Vis mer' }}
                        </button>
                      }
                    }
                    @if (event.location) {
                      <p class="text-xs text-gray-400">{{ event.location }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Manuelle hendelser -->
          @if (todayManualEvents().length > 0) {
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Hendelser</h3>
              @for (event of todayManualEvents(); track event.id) {
                <button (click)="openEditCalendarEvent(event)" class="w-full flex gap-3 items-start bg-indigo-50 rounded-xl p-3 text-left active:bg-indigo-100 transition-colors"
                        [style.border-left]="'3px solid ' + getAssignedColor(event.assignedTo)">
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                    <p class="text-xs text-gray-400 mt-0.5">{{ formatManualEventTimeLabel(event) }}</p>
                    @if (event.description) {
                      @let ceExp = isExpanded('ce-' + event.id);
                      @let ceLong = event.description.length > 150;
                      <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ ceLong && !ceExp ? (event.description | slice:0:150) + '…' : event.description }}</p>
                      @if (ceLong) {
                        <span (click)="$event.stopPropagation(); toggleExpand('ce-' + event.id)"
                              class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ ceExp ? 'Vis mindre' : 'Vis mer' }}</span>
                      }
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="getAssignedColor(event.assignedTo)">
                      {{ getAssignedLabel(event.assignedTo) }}
                    </p>
                  </div>
                  <span class="text-[10px] text-indigo-600 font-medium bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">Hendelse</span>
                </button>
              }
            </div>
          }

          <!-- Påminnelser -->
          @if (reminderEvents().length > 0) {
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Påminnelser</h3>
              @for (event of reminderEvents(); track $index) {
                <button (click)="openEditEvent(event)" class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                  <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                    @if (event.description) {
                      @let evtExp = isExpanded(event.childId + event.date + event.title);
                      @let evtLong = event.description.length > 150;
                      <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ evtLong && !evtExp ? (event.description | slice:0:150) + '…' : event.description }}</p>
                      @if (evtLong) {
                        <span (click)="$event.stopPropagation(); toggleExpand(event.childId + event.date + event.title)"
                              class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ evtExp ? 'Vis mindre' : 'Vis mer' }}</span>
                      }
                    }
                    <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                  </div>
                  <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                </button>
              }
            </div>
          }

          <!-- Lekser -->
          @if (regularHomeworkEvents().length > 0) {
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Lekser</h3>
              @for (event of regularHomeworkEvents(); track $index) {
                <app-homework-item
                  [event]="event"
                  [childName]="event.childName"
                  [childColor]="event.childColor"
                  (edit)="openEditEvent(event)" />
              }
            </div>
          }

          <!-- Morgendagens påminnelser -->
          @if (tomorrowReminders().length > 0 || tomorrowManualReminders().length > 0) {
            @if (showTomorrowProminent()) {
              <div class="space-y-2">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Husk i morgen!</h3>
                @for (event of tomorrowReminders(); track $index) {
                  <button (click)="openEditEvent(event)" class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                    <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                    <div class="flex-1 min-w-0">
                      <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                      @if (event.description) {
                        @let evtExp = isExpanded(event.childId + event.date + event.title);
                        @let evtLong = event.description.length > 150;
                        <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ evtLong && !evtExp ? (event.description | slice:0:150) + '…' : event.description }}</p>
                        @if (evtLong) {
                          <span (click)="$event.stopPropagation(); toggleExpand(event.childId + event.date + event.title)"
                                class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ evtExp ? 'Vis mindre' : 'Vis mer' }}</span>
                        }
                      }
                      <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                    </div>
                    <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                  </button>
                }
                @for (reminder of tomorrowManualReminders(); track reminder.id) {
                  <button (click)="openEditReminder(reminder)" class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                    <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="getAssignedColor(reminder.assignedTo)"></div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-800 text-sm">{{ reminder.title }}</span>
                        @if (reminder.time) {
                          <span class="text-[10px] text-gray-400">{{ reminder.time }}</span>
                        }
                      </div>
                      @if (reminder.description) {
                        @let remExp = isExpanded('rem-' + reminder.id);
                        @let remLong = reminder.description.length > 150;
                        <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ remLong && !remExp ? (reminder.description | slice:0:150) + '…' : reminder.description }}</p>
                        @if (remLong) {
                          <span (click)="$event.stopPropagation(); toggleExpand('rem-' + reminder.id)"
                                class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ remExp ? 'Vis mindre' : 'Vis mer' }}</span>
                        }
                      }
                      <p class="text-[10px] font-semibold mt-1" [style.color]="getAssignedColor(reminder.assignedTo)">
                        {{ getAssignedLabel(reminder.assignedTo) }}
                      </p>
                    </div>
                    <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                  </button>
                }
              </div>
            } @else {
              <div class="space-y-2">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">I morgen</h3>
                @for (event of tomorrowReminders(); track $index) {
                  <button (click)="openEditEvent(event)" class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                    <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="event.childColor"></div>
                    <div class="flex-1 min-w-0">
                      <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                      @if (event.description) {
                        @let evtExp = isExpanded(event.childId + event.date + event.title);
                        @let evtLong = event.description.length > 150;
                        <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ evtLong && !evtExp ? (event.description | slice:0:150) + '…' : event.description }}</p>
                        @if (evtLong) {
                          <span (click)="$event.stopPropagation(); toggleExpand(event.childId + event.date + event.title)"
                                class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ evtExp ? 'Vis mindre' : 'Vis mer' }}</span>
                        }
                      }
                      <p class="text-[10px] font-semibold mt-1" [style.color]="event.childColor">{{ event.childName }}</p>
                    </div>
                    <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                  </button>
                }
                @for (reminder of tomorrowManualReminders(); track reminder.id) {
                  <button (click)="openEditReminder(reminder)" class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                    <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" [style.background]="getAssignedColor(reminder.assignedTo)"></div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-800 text-sm">{{ reminder.title }}</span>
                        @if (reminder.time) {
                          <span class="text-[10px] text-gray-400">{{ reminder.time }}</span>
                        }
                      </div>
                      @if (reminder.description) {
                        @let remExp = isExpanded('rem-' + reminder.id);
                        @let remLong = reminder.description.length > 150;
                        <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ remLong && !remExp ? (reminder.description | slice:0:150) + '…' : reminder.description }}</p>
                        @if (remLong) {
                          <span (click)="$event.stopPropagation(); toggleExpand('rem-' + reminder.id)"
                                class="text-xs text-blue-500 font-medium mt-0.5 cursor-pointer">{{ remExp ? 'Vis mindre' : 'Vis mer' }}</span>
                        }
                      }
                      <p class="text-[10px] font-semibold mt-1" [style.color]="getAssignedColor(reminder.assignedTo)">
                        {{ getAssignedLabel(reminder.assignedTo) }}
                      </p>
                    </div>
                    <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                  </button>
                }
              </div>
            }
          }

          <!-- Ukelekser per barn (sammenleggbar, default lukket) — kun man–tors -->
          @if (isUkelekserVisible()) {
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
              <div class="grid transition-all duration-300 ease-in-out"
                   [class]="isUkelekseOpen(entry.child.id) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
                <div class="overflow-hidden">
                  <div class="px-4 pb-4 space-y-2">
                    @for (event of entry.events; track $index) {
                      <app-homework-item
                        [event]="event"
                        [subtle]="true"
                        (edit)="openEditEventForChild(entry.child, event)" />
                    }
                  </div>
                </div>
              </div>
            </div>
          }
          } <!-- /isUkelekserVisible -->

        }
      </div>
    }

    @if (editingTaggedEvent()) {
      <app-event-edit-sheet
        [event]="editingTaggedEvent()!"
        (saved)="onEventSaved($event)"
        (deleted)="onEventDeleted()"
        (cancelled)="editingTaggedEvent.set(null)" />
    }

    @if (editingReminder() !== undefined) {
      <app-reminder-sheet
        [reminder]="editingReminder() ?? null"
        [defaultDate]="selectedDate()"
        (saved)="onReminderSaved($event)"
        (deleted)="onReminderDeleted()"
        (cancelled)="editingReminder.set(undefined)" />
    }

    @if (editingCalendarEvent() !== undefined) {
      <app-calendar-event-sheet
        [event]="editingCalendarEvent() ?? null"
        [defaultDate]="selectedDate()"
        (saved)="onCalendarEventSaved($event)"
        (deleted)="onCalendarEventDeleted()"
        (cancelled)="editingCalendarEvent.set(undefined)" />
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
  private expandedEventIds = signal(new Set<string>());
  showOverridePanel = signal(false);
  editingTaggedEvent = signal<TaggedEvent | null>(null);
  editingReminder = signal<ManualReminder | undefined>(undefined);
  editingCalendarEvent = signal<ManualCalendarEvent | undefined>(undefined);

  private get todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  selectedDate = computed(() => {
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
    return [...this.google.events(), ...this.google.personalEvents()].filter((e) => e.date === this.selectedDate());
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
        if (e.date === date && e.category !== 'weekly_homework') {
          result.push({ ...e, childName: child.name, childColor: child.color, childId: child.id, planRef: e });
        }
      }
    }
    return result;
  });

  /** Etter kl. 18 på valgt dag (kun gjeldende for «i dag») */
  isAfter18 = computed<boolean>(() => this.isToday() && new Date().getHours() >= 18);

  quickActions = computed<TaggedEvent[]>(() => {
    const all = this.allTodayEvents().filter((e) => e.category === 'reminder');
    // SchoolEvent har ikke tidspunkt → etter 18:00 skjules alle skoleplan-påminnelser
    if (this.isAfter18()) return [];
    return all;
  });

  reminderEvents = computed<TaggedEvent[]>(() => {
    if (this.isAfter18()) return [];
    const qaSet = new Set(this.quickActions());
    return this.allTodayEvents().filter((e) => e.category === 'reminder' && !qaSet.has(e));
  });

  regularHomeworkEvents = computed<TaggedEvent[]>(() => {
    return this.allTodayEvents().filter((e) => e.category === 'homework');
  });

  /** Vis «I morgen» med fremhevet amber-design når det er etter 18 og ingen dagspåminnelser */
  showTomorrowProminent = computed<boolean>(
    () => this.isAfter18() && this.quickActions().length === 0 && this.todayManualReminders().length === 0
  );

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
          result.push({ ...e, childName: child.name, childColor: child.color, childId: child.id, planRef: e });
        }
      }
    }
    return result;
  });

  todayManualReminders = computed<ManualReminder[]>(() => {
    const date = this.selectedDate();
    const all = this.data.manualReminders().filter((r) => this.reminderOccursOnDate(r, date));
    // Etter 18:00 vises kun manuelle påminnelser med klokkeslett fra 18:00
    if (this.isAfter18()) return all.filter((r) => r.time != null && r.time >= '18:00');
    return all;
  });

  todayManualEvents = computed<ManualCalendarEvent[]>(() => {
    const date = this.selectedDate();
    return this.data.calendarEvents().filter((e) => this.calendarEventOccursOnDate(e, date));
  });

  tomorrowManualReminders = computed<ManualReminder[]>(() => {
    const date = this.tomorrowDate();
    return this.data.manualReminders().filter((r) => this.reminderOccursOnDate(r, date));
  });

  // Ukelekser vises kun mandag–torsdag (0=søn,1=man,...,4=tor,5=fre,6=lør)
  isUkelekserVisible = computed(() => {
    const d = new Date(this.selectedDate() + 'T00:00:00');
    const dow = d.getDay();
    return dow >= 1 && dow <= 4;
  });

  // Ukelekser grouped per child — kun for inneværende uke
  allUkelekser = computed<ChildUkelekser[]>(() => {
    const children = this.data.children();
    const plansMap = this.data.plansMap();
    const { uke: currentUke, aar: currentAar } = getISOWeekYear(this.selectedDate());
    const result: ChildUkelekser[] = [];
    for (const child of children) {
      const plans = plansMap[child.id] ?? [];
      const plan = plans.find(
        (p) => p.metadata.uke === currentUke && p.metadata.aar === currentAar
      ) ?? null;
      if (!plan) continue;
      const ukelekser = plan.events.filter((e) => e.category === 'weekly_homework');
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

  /** True if today or tomorrow is a handover day. Also returns which day for the label. */
  readonly switchDayAlert = computed<{ active: boolean; label: string }>(() => {
    const today = this.todayIso;
    const dTomorrow = new Date(today + 'T00:00:00');
    dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomorrow =
      dTomorrow.getFullYear() + '-' + String(dTomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(dTomorrow.getDate()).padStart(2, '0');
    const dYesterday = new Date(today + 'T00:00:00');
    dYesterday.setDate(dYesterday.getDate() - 1);
    const yesterday =
      dYesterday.getFullYear() + '-' + String(dYesterday.getMonth() + 1).padStart(2, '0') + '-' + String(dYesterday.getDate()).padStart(2, '0');

    const todayRes = this.residency.residencyForDate(today);
    const tomorrowRes = this.residency.residencyForDate(tomorrow);
    const yesterdayRes = this.residency.residencyForDate(yesterday);

    const isToday = todayRes !== null && yesterdayRes !== null && todayRes !== yesterdayRes;
    const isTomorrow = todayRes !== null && tomorrowRes !== null && todayRes !== tomorrowRes;

    if (isToday) return { active: true, label: 'Byttedag i dag! Sjekk pakkelisten' };
    if (isTomorrow) return { active: true, label: 'Byttedag i morgen! Sjekk pakkelisten' };
    return { active: false, label: '' };
  });

  /** @deprecated kept for template compatibility */
  readonly isSwitchDayTomorrow = computed(() => this.switchDayAlert().active);

  goToSkole() { this.router.navigate(['/skole']); }
  goToSettings() { this.router.navigate(['/innstillinger']); }

  openEditEvent(event: TaggedEvent): void {
    this.editingTaggedEvent.set(event);
  }

  openEditReminder(reminder: ManualReminder): void {
    this.editingReminder.set(reminder);
  }

  onReminderSaved(payload: Omit<ManualReminder, 'id' | 'createdAt'>): void {
    const editing = this.editingReminder();
    if (editing) this.data.updateManualReminder(editing.id, payload);
    this.editingReminder.set(undefined);
  }

  onReminderDeleted(): void {
    const editing = this.editingReminder();
    if (editing) this.data.deleteManualReminder(editing.id);
    this.editingReminder.set(undefined);
  }

  openEditCalendarEvent(event: ManualCalendarEvent): void {
    this.editingCalendarEvent.set(event);
  }

  onCalendarEventSaved(payload: Omit<ManualCalendarEvent, 'id' | 'createdAt'>): void {
    const editing = this.editingCalendarEvent();
    if (editing) this.data.updateCalendarEvent(editing.id, payload);
    this.editingCalendarEvent.set(undefined);
  }

  onCalendarEventDeleted(): void {
    const editing = this.editingCalendarEvent();
    if (editing) this.data.deleteCalendarEvent(editing.id);
    this.editingCalendarEvent.set(undefined);
  }

  openEditEventForChild(child: Child, event: SchoolEvent): void {
    this.editingTaggedEvent.set({ ...event, childName: child.name, childColor: child.color, childId: child.id, planRef: event });
  }

  onEventSaved(updated: SchoolEvent): void {
    const original = this.editingTaggedEvent();
    if (!original) return;
    this.data.updateEventInPlan(original.childId, original.planRef, updated);
    this.editingTaggedEvent.set(null);
  }

  onEventDeleted(): void {
    const original = this.editingTaggedEvent();
    if (!original) return;
    this.data.deleteEventFromPlan(original.childId, original.planRef);
    this.editingTaggedEvent.set(null);
  }

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

  private reminderOccursOnDate(reminder: ManualReminder, date: string): boolean {
    if (!reminder.recurrence) return reminder.date === date;
    const startMs = new Date(reminder.date + 'T00:00:00Z').getTime();
    const checkMs = new Date(date + 'T00:00:00Z').getTime();
    if (checkMs < startMs) return false;
    if (new Date(reminder.date + 'T00:00:00Z').getUTCDay() !== new Date(date + 'T00:00:00Z').getUTCDay()) return false;
    const diffWeeks = Math.round((checkMs - startMs) / (7 * 24 * 60 * 60 * 1000));
    if (reminder.recurrence.type === 'weekly') return true;
    return diffWeeks % 2 === 0;
  }

  private calendarEventOccursOnDate(event: ManualCalendarEvent, date: string): boolean {
    if (!event.recurrence) {
      return event.startDate <= date && date <= event.endDate;
    }
    const startMs = new Date(event.startDate + 'T00:00:00Z').getTime();
    const checkMs = new Date(date + 'T00:00:00Z').getTime();
    if (checkMs < startMs) return false;
    const durationDays = Math.round(
      (new Date(event.endDate + 'T00:00:00Z').getTime() - startMs) / (24 * 60 * 60 * 1000)
    );
    const intervalDays = event.recurrence.type === 'weekly' ? 7 : 14;
    const diffDays = Math.round((checkMs - startMs) / (24 * 60 * 60 * 1000));
    return diffDays % intervalDays <= durationDays;
  }

  isExpanded(key: string): boolean {
    return this.expandedEventIds().has(key);
  }

  toggleExpand(key: string): void {
    this.expandedEventIds.update((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
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

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

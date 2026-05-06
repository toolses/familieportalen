import { Component, computed, inject, signal, OnInit, effect, untracked } from '@angular/core';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { SchoolEvent, ManualReminder } from '../school-plan/models/school-plan.models';
import { getDatesOfWeek, formatDateShort, dayName, getMondayOfWeek, getISOWeekYear } from '../../shared/utils/date-utils';
import { ImageCaptureComponent } from '../school-plan/image-capture.component';
import { PlanReviewComponent } from '../school-plan/plan-review.component';
import { SchoolPlanService } from '../school-plan/services/school-plan.service';
import { PlanMetadata } from '../school-plan/models/school-plan.models';
import { FormsModule } from '@angular/forms';
import { downscaleBase64Image } from '../../shared/utils/image-utils';
import { SwipeDirective } from '../../shared/directives/swipe.directive';
import { EventEditSheetComponent, WeekDayOption } from '../../shared/components/event-edit-sheet.component';
import { HomeworkItemComponent } from '../../shared/components/homework-item.component';
import { ReminderSheetComponent } from '../../shared/components/reminder-sheet.component';

interface DayInfo {
  date: string;
  label: string;
  dayName: string;
  isToday: boolean;
}

type SkoleView = 'WEEK' | 'SCAN' | 'REVIEW';

@Component({
  selector: 'app-skole',
  standalone: true,
  imports: [ImageCaptureComponent, PlanReviewComponent, FormsModule, SwipeDirective, EventEditSheetComponent, HomeworkItemComponent, ReminderSheetComponent],
  template: `
    @switch (view()) {
      @case ('WEEK') {
        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 class="text-lg font-bold text-gray-800">Skole</h2>
          <button (click)="view.set('SCAN')"
                  class="text-sm text-blue-600 font-medium flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Skann ukeplan
          </button>
        </div>

        <div class="px-4 pt-2 pb-6 space-y-4" appSwipe (swipeLeft)="nextDay()" (swipeRight)="prevDay()">
            <!-- Week header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1">
                <button (click)="prevWeek()" class="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 active:scale-90 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <h2 class="text-lg font-bold text-gray-800 px-1">
                  Uke {{ viewedUkeAar()?.uke }}
                </h2>
                <button (click)="nextWeek()" class="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 active:scale-90 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <!-- Child selector -->
              @if (data.children().length > 1) {
                <div class="flex gap-2 overflow-x-auto scrollbar-hide">
                  @for (child of data.children(); track child.id) {
                    <button
                      (click)="switchChild(child.id)"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-all active:scale-[0.98]"
                      [class]="data.activeChildId() === child.id
                        ? 'bg-white shadow-md ring-2 text-gray-900'
                        : 'bg-gray-100 text-gray-500'"
                      [style.--tw-ring-color]="child.color">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="child.color"></span>
                      {{ child.name }}
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Day selector -->
            <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide justify-center">
              @for (day of weekDays(); track day.date) {
                <button
                  (click)="selectedDate.set(day.date)"
                  class="flex flex-col items-center min-w-[4rem] py-2 px-3 rounded-xl transition-all shrink-0"
                  [class]="selectedDate() === day.date
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : day.isToday ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'">
                  <span class="text-xs font-medium uppercase"
                        [class]="selectedDate() === day.date ? 'text-blue-200' : ''">
                    {{ day.dayName }}
                  </span>
                  <span class="text-lg font-bold mt-0.5">{{ day.label }}</span>
                  @if (dayHasReminders(day.date)) {
                    <div class="w-1.5 h-1.5 rounded-full mt-1"
                         [class]="selectedDate() === day.date ? 'bg-amber-300' : 'bg-amber-500'"></div>
                  }
                </button>
              }
            </div>

            <!-- INFORMATION -->
            @if (informationEvents().length > 0) {
              <div class="space-y-2">
                <button (click)="infoExpanded.update(v => !v)"
                        class="w-full flex items-center gap-2 px-1 text-left">
                  <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-1">Informasjon</h3>
                  <span class="text-xs text-gray-400">{{ informationEvents().length }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                       class="text-gray-400 transition-transform duration-200 shrink-0"
                       [class.rotate-180]="infoExpanded()">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div class="grid transition-all duration-300 ease-in-out"
                     [class]="infoExpanded() ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
                  <div class="overflow-hidden">
                    <div class="space-y-2 pt-1">
                      @for (event of informationEvents(); track $index) {
                        <button (click)="openEditEvent(event)"
                                class="w-full flex gap-3 items-start bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-left active:bg-emerald-100 transition-colors">
                          <div class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                          <div class="flex-1 min-w-0">
                            <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                            @if (event.description) {
                              <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                            }
                          </div>
                          <span class="text-[10px] text-emerald-600 font-medium bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">Info</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- REMINDERS -->
            @if (reminderEvents().length > 0 || schoolManualReminders().length > 0) {
              <div class="space-y-2">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Påminnelser</h3>
                @for (event of reminderEvents(); track $index) {
                  <button (click)="openEditEvent(event)"
                          class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                    <div class="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                    <div class="flex-1 min-w-0">
                      <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                      @if (event.description) {
                        <p class="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                      }
                    </div>
                    <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                  </button>
                }
                @for (reminder of schoolManualReminders(); track reminder.id) {
                  <button (click)="editingReminder.set(reminder)"
                          class="w-full flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-3 text-left active:bg-amber-100 transition-colors">
                    <div class="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
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
                    </div>
                    <span class="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Påminnelse</span>
                  </button>
                }
              </div>
            }

            <!-- HOMEWORK -->
            @if (homeworkEvents().length > 0) {
              <div class="space-y-2">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Lekser</h3>
                @for (event of homeworkEvents(); track $index) {
                  <app-homework-item
                    [event]="event"
                    (edit)="openEditEvent(event)" />
                }
              </div>
            }

            <!-- Empty state when no plan and no reminders -->
            @if (!viewedPlan() && informationEvents().length === 0 && reminderEvents().length === 0 && schoolManualReminders().length === 0 && homeworkEvents().length === 0) {
              <div class="flex flex-col items-center py-12 text-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 text-gray-300"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                <p class="text-sm">Ingen ukeplan for denne uken</p>
              </div>
            }

            <!-- ORIGINAL PLAN IMAGES -->
            @if (planImages()) {
              <div class="bg-gray-50 rounded-2xl p-4">
                <h3 class="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  Se originalplan
                </h3>
                <div class="flex gap-3">
                  <button (click)="lightboxImage.set(planImages()!.front)" class="rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
                    <img [src]="planImages()!.front" alt="Forside" class="w-20 h-28 object-cover" />
                  </button>
                  @if (planImages()!.back) {
                    <button (click)="lightboxImage.set(planImages()!.back!)" class="rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
                      <img [src]="planImages()!.back!" alt="Bakside" class="w-20 h-28 object-cover" />
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Lightbox overlay -->
          @if (lightboxImage()) {
            <div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                 (click)="lightboxImage.set(null)">
              <button class="absolute top-4 right-4 text-white/80 hover:text-white z-10" (click)="lightboxImage.set(null)">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
              <img [src]="lightboxImage()!" alt="Originalplan"
                   class="max-w-full max-h-full object-contain"
                   style="touch-action: pinch-zoom;"
                   (click)="$event.stopPropagation()" />
            </div>
          }
      }

      @case ('SCAN') {
        <div class="max-w-2xl mx-auto p-4">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold">Skann ukeplan</h2>
            <button (click)="cancelScan()" class="text-sm text-gray-500">Avbryt</button>
          </div>

          <!-- Week number override -->
          <div class="bg-white rounded-2xl p-4 shadow-sm mb-4 space-y-2">
            <label class="block text-sm font-medium text-gray-700">Ukenummer</label>
            <div class="flex items-center gap-3">
              <input type="number" [(ngModel)]="scanWeekNumber" min="1" max="53"
                     class="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center font-semibold" />
              <span class="text-sm text-gray-400">Uke {{ scanWeekNumber }}, {{ scanYear }}</span>
            </div>
            <p class="text-xs text-gray-400">Overstyrer ukenummeret AI-en finner i bildet.</p>
          </div>

          <app-image-capture #capture (imagesReady)="onImagesReady($event)" />
          @if (scanError()) {
            <div class="mt-4 p-3 bg-red-100 text-red-800 rounded-xl">{{ scanError() }}</div>
          }
        </div>
      }

      @case ('REVIEW') {
        <div class="max-w-2xl mx-auto p-4">
          <h2 class="text-2xl font-bold mb-4">Gjennomgang</h2>
          <app-plan-review
            [events]="reviewEvents()"
            [metadata]="reviewMetadata()"
            [rawResponse]="reviewRaw()"
            [rawOcr]="reviewRawOcr()"
            [images]="reviewImages()"
            (eventsChange)="reviewEvents.set($event)" />
          <div class="mt-4 space-y-2">
            @if (saveSuccess()) {
              <div class="p-3 bg-green-100 text-green-800 rounded-xl text-sm text-center font-medium">
                Ukeplanen er lagret!
              </div>
            }
            <button (click)="onSaveClick()"
                    [disabled]="isSaving()"
                    class="w-full bg-blue-600 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-60 active:scale-[0.98]">
              @if (isSaving() && saveMode() === 'full') {
                <span class="inline-flex items-center gap-2">
                  <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Lagrer...
                </span>
              } @else {
                Lagre ukeplan
              }
            </button>
            <button (click)="onSaveImagesOnlyClick()"
                    [disabled]="isSaving()"
                    class="w-full border border-gray-300 text-gray-600 py-2 rounded-xl active:scale-[0.98] disabled:opacity-60">
              @if (isSaving() && saveMode() === 'images-only') {
                <span class="inline-flex items-center gap-2 justify-center">
                  <span class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                  Lagrer...
                </span>
              } @else {
                Lagre kun bilder
              }
            </button>
            <button (click)="view.set('SCAN')"
                    class="w-full border border-gray-300 text-gray-600 py-2 rounded-xl active:scale-[0.98]">
              Skann på nytt
            </button>
          </div>

          <!-- Child picker overlay -->
          @if (showChildPicker()) {
            <div class="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
                 (click)="showChildPicker.set(false)">
              <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl" (click)="$event.stopPropagation()">
                <h3 class="text-lg font-bold text-gray-800">Hvilket barn gjelder denne planen for?</h3>
                <div class="space-y-2">
                  @for (child of data.children(); track child.id) {
                    <button (click)="saveForChild(child.id)"
                            class="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all active:scale-[0.98]">
                      <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                           [style.background]="child.color">
                        {{ child.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="text-left">
                        <span class="font-medium text-gray-800">{{ child.name }}</span>
                        <span class="text-xs text-gray-400 ml-2">{{ child.grade }}</span>
                      </div>
                    </button>
                  }
                </div>
                <button (click)="showChildPicker.set(false)"
                        class="w-full text-center text-sm text-gray-400 py-2">Avbryt</button>
              </div>
            </div>
          }
        </div>
      }
    }

    @if (editingReminder() !== undefined) {
      <app-reminder-sheet
        [reminder]="editingReminder() ?? null"
        [defaultDate]="selectedDate()"
        (saved)="onReminderSaved($event)"
        (deleted)="onReminderDeleted()"
        (cancelled)="editingReminder.set(undefined)" />
    }

    @if (editingEvent()) {
      <app-event-edit-sheet
        [event]="editingEvent()!"
        [weekDays]="weekDayOptions()"
        (saved)="onEventSaved($event)"
        (deleted)="onEventDeleted()"
        (cancelled)="editingEvent.set(null)" />
    }
  `,
  styles: `
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `,
})
export class SkoleComponent implements OnInit {
  data = inject(SchoolDataService);
  private api = inject(SchoolPlanService);

  private get today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  view = signal<SkoleView>('WEEK');
  infoExpanded = signal(false);
  selectedDate = signal('');
  scanError = signal<string | null>(null);
  scanWeekNumber = this.getCurrentISOWeek();
  scanYear = new Date().getFullYear();

  // Review state
  reviewEvents = signal<SchoolEvent[]>([]);
  reviewMetadata = signal<PlanMetadata | null>(null);
  reviewRaw = signal('');
  reviewRawOcr = signal('');
  reviewImages = signal<{ front: string; back?: string }>({ front: '' });
  isSaving = signal(false);
  saveSuccess = signal(false);
  showChildPicker = signal(false);
  saveMode = signal<'full' | 'images-only'>('full');

  viewedMonday = signal('');

  viewedUkeAar = computed(() => {
    const m = this.viewedMonday();
    return m ? getISOWeekYear(m) : null;
  });

  viewedPlan = computed(() => {
    const info = this.viewedUkeAar();
    const childId = this.data.activeChildId();
    if (!info || !childId) return null;
    const plans = this.data.plansMap()[childId] ?? [];
    return plans.find((p) => p.metadata.uke === info.uke && p.metadata.aar === info.aar) ?? null;
  });

  private weekDateStrings = computed(() => {
    const info = this.viewedUkeAar();
    if (!info) return [];
    return getDatesOfWeek(info.uke, info.aar);
  });

  weekDays = computed<DayInfo[]>(() => {
    return this.weekDateStrings().map((d) => ({
      date: d,
      label: new Date(d + 'T00:00:00Z').getUTCDate().toString(),
      dayName: dayName(d).slice(0, 3).toLowerCase(),
      isToday: d === this.today,
    }));
  });

  /** Information events — shown on every day regardless of their date */
  informationEvents = computed(() => {
    const plan = this.viewedPlan();
    if (!plan || !this.selectedDate()) return [];
    return plan.events.filter((e) => e.category === 'information');
  });

  reminderEvents = computed(() => {
    const plan = this.viewedPlan();
    const date = this.selectedDate();
    if (!plan || !date) return [];
    return plan.events.filter((e) => e.date === date && e.category === 'reminder');
  });

  schoolManualReminders = computed<ManualReminder[]>(() => {
    const date = this.selectedDate();
    const childId = this.data.activeChildId();
    if (!date || !childId) return [];
    return this.data.manualReminders()
      .filter((r) =>
        r.isSchoolRelated &&
        this.reminderOccursOnDate(r, date) &&
        r.assignedTo.some((a) => a.type === 'child' && a.childId === childId)
      );
  });

  homeworkEvents = computed(() => {
    const plan = this.viewedPlan();
    const date = this.selectedDate();
    if (!plan || !date) return [];
    return plan.events.filter((e) =>
      e.category === 'weekly_homework' || (e.category === 'homework' && e.date === date)
    );
  });

  planImages = computed(() => this.viewedPlan()?.images ?? null);
  lightboxImage = signal<string | null>(null);

  editingEvent = signal<SchoolEvent | null>(null);
  editingReminder = signal<ManualReminder | undefined>(undefined);

  weekDayOptions = computed<WeekDayOption[]>(() =>
    this.weekDays().map((d) => ({
      date: d.date,
      label: d.dayName.charAt(0).toUpperCase() + d.dayName.slice(1) + ' ' + formatDateShort(d.date),
    }))
  );

  constructor() {
    effect(() => {
      this.data.activeChildId(); // track
      untracked(() => this.resetToCurrentWeek());
    });
  }

  ngOnInit() {
    this.resetToCurrentWeek();
  }

  private resetToCurrentWeek() {
    const monday = getMondayOfWeek(this.today);
    this.viewedMonday.set(monday);
    const dates = getDatesOfWeek(getISOWeekYear(monday).uke, getISOWeekYear(monday).aar);
    const todayMatch = dates.find((d) => d === this.today);
    this.selectedDate.set(todayMatch ?? dates[0] ?? this.today);
  }

  private initSelectedDate() {
    const dates = this.weekDateStrings();
    const todayMatch = dates.find((d) => d === this.today);
    this.selectedDate.set(todayMatch ?? dates[0] ?? this.today);
  }

  prevWeek(): void {
    const d = new Date(this.viewedMonday() + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 7);
    this.viewedMonday.set(d.toISOString().slice(0, 10));
    this.initSelectedDate();
  }

  nextWeek(): void {
    const d = new Date(this.viewedMonday() + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 7);
    this.viewedMonday.set(d.toISOString().slice(0, 10));
    this.initSelectedDate();
  }

  dayHasReminders(date: string): boolean {
    const plan = this.viewedPlan();
    const childId = this.data.activeChildId();
    const hasSchoolReminder = plan?.events.some((e) => e.date === date && e.category === 'reminder') ?? false;
    const hasManualReminder = this.data.manualReminders().some(
      (r) => r.isSchoolRelated && this.reminderOccursOnDate(r, date) &&
        r.assignedTo.some((a) => a.type === 'child' && a.childId === childId)
    );
    return hasSchoolReminder || hasManualReminder;
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


  prevDay(): void {
    const days = this.weekDays();
    const idx = days.findIndex((d) => d.date === this.selectedDate());
    if (idx > 0) this.selectedDate.set(days[idx - 1].date);
  }

  nextDay(): void {
    const days = this.weekDays();
    const idx = days.findIndex((d) => d.date === this.selectedDate());
    if (idx !== -1 && idx < days.length - 1) this.selectedDate.set(days[idx + 1].date);
  }

  openEditEvent(event: SchoolEvent): void {
    this.editingEvent.set(event);
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

  onEventSaved(updated: SchoolEvent): void {
    const original = this.editingEvent();
    if (!original) return;
    this.data.updateEventInActivePlan(original, updated);
    this.editingEvent.set(null);
  }

  onEventDeleted(): void {
    const event = this.editingEvent();
    if (!event) return;
    this.data.deleteEventFromActivePlan(event);
    this.editingEvent.set(null);
  }

  // ── Scan flow ──────────────────────

  onImagesReady(images: { front: string; back?: string; frontPreview: string; backPreview?: string }) {
    this.scanError.set(null);
    this.reviewImages.set({
      front: images.frontPreview,
      ...(images.backPreview ? { back: images.backPreview } : {}),
    });
    this.api.parse({
      frontImage: images.front,
      backImage: images.back,
      weekOverride: this.scanWeekNumber,
      yearOverride: this.scanYear,
    }).subscribe({
      next: (res) => {
        this.reviewEvents.set(res.data.events);
        this.reviewMetadata.set(res.data.metadata);
        this.reviewRaw.set(res.raw);
        this.reviewRawOcr.set(res.rawOcr || '');
        this.view.set('REVIEW');
      },
      error: (err) => {
        const body = err.error;
        const detail = body?.details || body?.error || 'Noe gikk galt under analysen';
        this.scanError.set(detail);
        if (body?.rawAiText) {
          console.error('Rå AI-tekst:', body.rawAiText);
        }
      },
    });
  }

  cancelScan() {
    this.view.set('WEEK');
    this.scanError.set(null);
  }

  switchChild(childId: string) {
    this.data.setActiveChild(childId);
    this.initSelectedDate();
  }

  onSaveClick() {
    this.saveMode.set('full');
    this.triggerSave();
  }

  onSaveImagesOnlyClick() {
    this.saveMode.set('images-only');
    this.triggerSave();
  }

  private triggerSave() {
    const children = this.data.children();
    if (children.length > 1) {
      this.showChildPicker.set(true);
    } else if (children.length === 1) {
      this.saveForChild(children[0].id);
    } else {
      this.savePlan();
    }
  }

  async saveForChild(childId: string) {
    const meta = this.reviewMetadata();
    if (!meta) return;
    this.showChildPicker.set(false);
    this.isSaving.set(true);
    this.saveSuccess.set(false);

    const images = await this.downscaleImages();
    const events = this.saveMode() === 'images-only' ? [] : this.reviewEvents();
    this.data.savePlanForChild(childId, meta, events, undefined, images);
    this.isSaving.set(false);
    this.saveSuccess.set(true);
    this.initSelectedDate();

    setTimeout(() => {
      this.view.set('WEEK');
      this.saveSuccess.set(false);
    }, 1200);
  }

  private async savePlan() {
    const meta = this.reviewMetadata();
    if (!meta) return;
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    const images = await this.downscaleImages();
    const events = this.saveMode() === 'images-only' ? [] : this.reviewEvents();
    this.data.savePlan(meta, events, undefined, images);
    this.isSaving.set(false);
    this.saveSuccess.set(true);
    this.initSelectedDate();

    setTimeout(() => {
      this.view.set('WEEK');
      this.saveSuccess.set(false);
    }, 1200);
  }

  private async downscaleImages(): Promise<{ front: string; back?: string }> {
    const raw = this.reviewImages();
    // 800 px keeps images readable on mobile while staying well within Firestore's 1 MB
    // document limit even when two children each have an active plan with images.
    const front = await downscaleBase64Image(raw.front, 800);
    const back = raw.back ? await downscaleBase64Image(raw.back, 800) : undefined;
    return { front, ...(back ? { back } : {}) };
  }

  private getCurrentISOWeek(): number {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}

import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { SchoolEvent } from '../school-plan/models/school-plan.models';
import { getDatesOfWeek, formatDateShort, dayName } from '../../shared/utils/date-utils';
import { ImageCaptureComponent } from '../school-plan/image-capture.component';
import { PlanReviewComponent } from '../school-plan/plan-review.component';
import { SchoolPlanService } from '../school-plan/services/school-plan.service';
import { PlanMetadata } from '../school-plan/models/school-plan.models';
import { FormsModule } from '@angular/forms';
import { downscaleBase64Image } from '../../shared/utils/image-utils';
import { SwipeDirective } from '../../shared/directives/swipe.directive';
import { EventEditSheetComponent, WeekDayOption } from '../../shared/components/event-edit-sheet.component';

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
  imports: [ImageCaptureComponent, PlanReviewComponent, FormsModule, SwipeDirective, EventEditSheetComponent],
  template: `
    @switch (view()) {
      @case ('WEEK') {
        <!-- Child Selector -->
        @if (data.children().length > 1) {
          <div class="flex gap-2 overflow-x-auto pb-1 px-4 pt-2 scrollbar-hide">
            @for (child of data.children(); track child.id) {
              <button
                (click)="switchChild(child.id)"
                class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-all active:scale-[0.98]"
                [class]="data.activeChildId() === child.id
                  ? 'bg-white shadow-md ring-2 text-gray-900'
                  : 'bg-gray-100 text-gray-500'"
                [style.--tw-ring-color]="child.color">
                <span class="w-3 h-3 rounded-full shrink-0" [style.background]="child.color"></span>
                {{ child.name }}
              </button>
            }
          </div>
        }

        @if (!data.activePlan()) {
          <!-- No plan yet -->
          <div class="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">Ingen ukeplan ennå</h2>
            <p class="text-gray-500 mb-8 max-w-xs">Skann en ukeplan for å komme i gang.</p>
            <button (click)="view.set('SCAN')"
                    class="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium text-lg shadow-lg shadow-blue-200 active:scale-95 transition-transform">
              Skann ukeplan
            </button>
          </div>
        } @else {
          <div class="px-4 pt-2 pb-6 space-y-4" appSwipe (swipeLeft)="nextDay()" (swipeRight)="prevDay()">
            <!-- Week header -->
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-800">
                Uke {{ data.activePlan()!.metadata.uke }}
              </h2>
              <button (click)="view.set('SCAN')"
                      class="text-sm text-blue-600 font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Ny skann
              </button>
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
              <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <h3 class="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <!-- Info icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  Informasjon
                </h3>
                <div class="space-y-2">
                  @for (event of informationEvents(); track $index) {
                    <button (click)="openEditEvent(event)"
                            class="w-full flex gap-3 items-start bg-white/60 rounded-xl p-3 active:bg-white transition-colors text-left">
                      <div class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                        @if (event.description) {
                          <p class="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                        }
                      </div>
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">Informasjon</span>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- REMINDERS -->
            @if (reminderEvents().length > 0) {
              <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h3 class="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <!-- Exclamation icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  Påminnelser
                </h3>
                <div class="space-y-2">
                  @for (event of reminderEvents(); track $index) {
                    <button (click)="openEditEvent(event)"
                            class="w-full flex gap-3 items-start bg-white/60 rounded-xl p-3 active:bg-white transition-colors text-left">
                      <div class="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                        @if (event.description) {
                          <p class="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                        }
                      </div>
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0 mt-0.5">Påminnelse</span>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- HOMEWORK -->
            @if (homeworkEvents().length > 0) {
              <div class="bg-blue-50 rounded-2xl p-4">
                <h3 class="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <!-- Book icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                  Lekser
                </h3>
                <div class="space-y-2">
                  @for (event of homeworkEvents(); track $index) {
                    <button (click)="openEditEvent(event)"
                            class="w-full flex gap-3 items-start active:bg-blue-50/50 rounded-xl transition-colors text-left">
                      @if (isUkelekse(event)) {
                        <!-- Star icon for ukelekse -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-amber-400 mt-1 shrink-0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      } @else {
                        <div class="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                      }
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-gray-800 text-sm">{{ event.title }}</span>
                        @if (event.description) {
                          <p class="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{{ event.description }}</p>
                        }
                      </div>
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0 mt-0.5">Lekse</span>
                    </button>
                  }
                </div>
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
              @if (isSaving()) {
                <span class="inline-flex items-center gap-2">
                  <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Lagrer...
                </span>
              } @else {
                Lagre ukeplan
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

  private weekDateStrings = computed(() => {
    const plan = this.data.activePlan();
    if (!plan) return [];
    return getDatesOfWeek(plan.metadata.uke, plan.metadata.aar);
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
    const plan = this.data.activePlan();
    if (!plan || !this.selectedDate()) return [];
    return plan.events.filter((e) => e.category === 'information');
  });

  reminderEvents = computed(() => {
    const plan = this.data.activePlan();
    const date = this.selectedDate();
    if (!plan || !date) return [];
    return plan.events.filter((e) => e.date === date && e.category === 'reminder');
  });

  homeworkEvents = computed(() => {
    const plan = this.data.activePlan();
    const date = this.selectedDate();
    if (!plan || !date) return [];
    return plan.events.filter((e) =>
      e.category === 'homework' && (e.date === date || this.isUkelekse(e))
    );
  });

  planImages = computed(() => this.data.activePlan()?.images ?? null);
  lightboxImage = signal<string | null>(null);

  editingEvent = signal<SchoolEvent | null>(null);

  weekDayOptions = computed<WeekDayOption[]>(() =>
    this.weekDays().map((d) => ({
      date: d.date,
      label: d.dayName.charAt(0).toUpperCase() + d.dayName.slice(1) + ' ' + formatDateShort(d.date),
    }))
  );

  ngOnInit() {
    this.initSelectedDate();
  }

  private initSelectedDate() {
    const plan = this.data.activePlan();
    if (plan) {
      const dates = getDatesOfWeek(plan.metadata.uke, plan.metadata.aar);
      const todayMatch = dates.find((d) => d === this.today);
      this.selectedDate.set(todayMatch ?? dates[0] ?? '');
    }
  }

  dayHasReminders(date: string): boolean {
    const plan = this.data.activePlan();
    if (!plan) return false;
    return plan.events.some((e) => e.date === date && e.category === 'reminder');
  }

  isUkelekse(event: SchoolEvent): boolean {
    return event.title.toLowerCase().startsWith('ukelekse');
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
    const children = this.data.children();
    if (children.length > 1) {
      this.showChildPicker.set(true);
    } else if (children.length === 1) {
      this.saveForChild(children[0].id);
    } else {
      // Legacy: no children configured
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
    this.data.setActiveChild(childId);
    this.data.savePlanForChild(childId, meta, this.reviewEvents(), undefined, images);
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
    this.data.savePlan(meta, this.reviewEvents(), undefined, images);
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
    const front = await downscaleBase64Image(raw.front);
    const back = raw.back ? await downscaleBase64Image(raw.back) : undefined;
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

import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanMetadata, SchoolEvent } from './models/school-plan.models';

type Tab = 'informasjon' | 'beskjeder' | 'lekser';

@Component({
  selector: 'app-plan-review',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">
      @if (metadata(); as meta) {
        <div class="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
          <span class="font-semibold">Uke {{ meta.uke }}, {{ meta.aar }}</span>
          @if (meta.trinn) {
            <span class="ml-2">&middot; {{ meta.trinn }}</span>
          }
        </div>
      }

      <!-- Segmented Control -->
      <div class="flex bg-gray-100 rounded-xl p-1 gap-1">
        @for (tab of tabs; track tab.key) {
          <button
            (click)="activeTab.set(tab.key)"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            [class]="activeTab() === tab.key
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-500 hover:text-gray-700'">
            <span>{{ tab.label }}</span>
            <span class="ml-1 text-xs opacity-60">({{ tabCount(tab.key) }})</span>
          </button>
        }
      </div>

      <!-- Event list -->
      @if (filteredEvents().length === 0) {
        <div class="text-center py-8 text-gray-400 text-sm">
          Ingen hendelser i denne kategorien
        </div>
      } @else {
        <div class="space-y-2">
          @for (event of filteredEvents(); track $index) {
            <div class="border rounded-xl p-3 transition-all" [class]="borderClass(event.category)">
              <div class="flex items-start justify-between gap-2">
                <select [ngModel]="event.category"
                        (ngModelChange)="event.category = $event"
                        class="text-xs px-2 py-0.5 rounded-full font-medium border-0 appearance-none cursor-pointer"
                        [class]="badgeClass(event.category)">
                  <option value="information">Informasjon</option>
                  <option value="reminder">Påminnelse</option>
                  <option value="homework">Lekse</option>
                  <option value="weekly_homework">Ukelekse</option>
                  <option value="school_class">Fag</option>
                </select>
                <div class="flex items-center gap-2 shrink-0">
                  <label class="relative shrink-0 inline-block overflow-hidden text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-0.5 bg-white focus-within:ring-2 focus-within:ring-indigo-400 cursor-pointer">
                    @if (event.date) { {{ formatDate(event.date) }} } @else { <span class="text-gray-400">Dato</span> }
                    <input type="date" [(ngModel)]="event.date"
                           class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <button (click)="deleteEvent(event); $event.stopPropagation()"
                          class="relative z-10 text-gray-300 hover:text-red-400 transition-colors active:scale-90"
                          title="Slett hendelse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
              <div class="mt-2 space-y-1">
                <input [(ngModel)]="event.title"
                       class="w-full border rounded-lg px-2 py-1 text-sm font-medium" />
                <textarea [(ngModel)]="event.description" rows="3"
                          class="w-full border rounded-lg px-2 py-1 text-sm text-gray-600 resize-y"></textarea>
              </div>
            </div>
          }
        </div>
      }

      <!-- Debug section -->
      <div class="border-t pt-3 mt-4 space-y-3">
        <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">Feilsøking</p>

        <!-- Captured images -->
        @if (images().front; as frontSrc) {
          <div>
            <p class="text-xs text-gray-500 mb-2">Bilder sendt til AI:</p>
            <div class="flex gap-3">
              <div class="cursor-pointer" (click)="lightboxSrc.set(images().front)">
                <img [src]="images().front" alt="Ukeplan" class="w-20 h-20 object-cover rounded-lg border hover:ring-2 hover:ring-blue-400 transition-all" />
                <span class="text-[10px] text-gray-400 block text-center mt-1">Ukeplan</span>
              </div>
              @if (images().back) {
                <div class="cursor-pointer" (click)="lightboxSrc.set(images().back!)">
                  <img [src]="images().back" alt="Timeplan" class="w-20 h-20 object-cover rounded-lg border hover:ring-2 hover:ring-blue-400 transition-all" />
                  <span class="text-[10px] text-gray-400 block text-center mt-1">Timeplan</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Raw OCR text -->
        <button (click)="showOcr.set(!showOcr())"
                class="text-xs text-gray-400 underline">
          {{ showOcr() ? 'Skjul' : 'Vis' }} rå OCR-tekst (hva AI-en leste)
        </button>
        @if (showOcr() && rawOcr()) {
          <pre class="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-xs overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-words">{{ rawOcr() }}</pre>
        }
        @if (showOcr() && !rawOcr()) {
          <p class="text-xs text-gray-400 italic">Ingen OCR-tekst returnert</p>
        }

        <!-- Raw response toggle -->
        <button (click)="showRaw.set(!showRaw())"
                class="text-xs text-gray-400 underline">
          {{ showRaw() ? 'Skjul' : 'Vis' }} rå JSON-respons fra AI
        </button>
        @if (showRaw()) {
          <pre class="bg-gray-100 p-3 rounded-xl text-xs overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-words">{{ rawResponse() }}</pre>
        }
      </div>
    </div>

    <!-- Lightbox -->
    @if (lightboxSrc()) {
      <div class="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
           (click)="lightboxSrc.set(null)">
        <button class="absolute top-4 right-4 text-white text-3xl font-light z-10" aria-label="Lukk">✕</button>
        <img [src]="lightboxSrc()" alt="Fullstørrelse" class="max-w-full max-h-full object-contain rounded-lg" (click)="$event.stopPropagation()" />
      </div>
    }
  `,
})
export class PlanReviewComponent {
  events = input.required<SchoolEvent[]>();
  metadata = input<PlanMetadata | null>(null);
  rawResponse = input<string>('');
  rawOcr = input<string>('');
  images = input<{ front: string; back?: string }>({ front: '' });
  eventsChange = output<SchoolEvent[]>();

  activeTab = signal<Tab>('informasjon');
  showRaw = signal(false);
  showOcr = signal(false);
  lightboxSrc = signal<string | null>(null);

  tabs: { key: Tab; label: string }[] = [
    { key: 'informasjon', label: 'Info' },
    { key: 'beskjeder', label: 'Beskjeder' },
    { key: 'lekser', label: 'Lekser' },
  ];

  filteredEvents = computed(() => {
    const tab = this.activeTab();
    return this.events().filter((e) => {
      if (tab === 'informasjon') return e.category === 'information';
      if (tab === 'beskjeder') return e.category === 'reminder';
      return e.category === 'homework' || e.category === 'weekly_homework';
    });
  });

  tabCount(tab: Tab): number {
    return this.events().filter((e) => {
      if (tab === 'informasjon') return e.category === 'information';
      if (tab === 'beskjeder') return e.category === 'reminder';
      return e.category === 'homework' || e.category === 'weekly_homework';
    }).length;
  }

  deleteEvent(event: SchoolEvent): void {
    this.eventsChange.emit(this.events().filter((e) => e !== event));
  }

  formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  badgeClass(cat: SchoolEvent['category']): string {
    const map: Record<string, string> = {
      information: 'bg-emerald-100 text-emerald-800',
      school_class: 'bg-blue-100 text-blue-800',
      homework: 'bg-orange-100 text-orange-800',
      weekly_homework: 'bg-orange-50 text-orange-700',
      reminder: 'bg-amber-100 text-amber-800',
    };
    return map[cat] ?? 'bg-gray-100';
  }

  borderClass(cat: SchoolEvent['category']): string {
    const map: Record<string, string> = {
      information: 'border-emerald-200',
      school_class: 'border-blue-200',
      homework: 'border-orange-200',
      weekly_homework: 'border-orange-100',
      reminder: 'border-amber-200',
    };
    return map[cat] ?? '';
  }
}

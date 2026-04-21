import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { ResidencyService } from '../../shared/services/residency.service';
import { BaseRotation } from '../school-plan/models/school-plan.models';

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

interface GridCell {
  date: string | null;
  dayNum: number;
  residency: 'Mamma' | 'Pappa' | null;
  isToday: boolean;
  hasOverride: boolean;
}

@Component({
  selector: 'app-residency-planner',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">

      <!-- Rotation status banner -->
      @if (data.baseRotation(); as rot) {
        <div class="flex items-start justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
          <div>
            <span class="text-xs font-semibold text-green-700">Rotasjon aktiv – annenhver uke</span>
            <p class="text-xs text-green-600 mt-0.5">
              Starter hos <strong>{{ rot.startLabel }}</strong> fra {{ rot.startDate }}
            </p>
          </div>
          <div class="flex gap-3 shrink-0 ml-2">
            <button (click)="openSetup()" class="text-xs font-medium text-green-700 underline">Endre</button>
            <button (click)="clearRotation()" class="text-xs font-medium text-red-500">Fjern</button>
          </div>
        </div>
      } @else {
        <div class="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <span class="text-xs text-amber-700">Ingen fast rotasjon satt opp ennå.</span>
          <button (click)="openSetup()" class="text-xs font-semibold text-amber-800 underline ml-2">Sett opp</button>
        </div>
      }

      <!-- Setup form -->
      @if (setupOpen()) {
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p class="text-xs font-semibold text-gray-700">Konfigurer fast rotasjon</p>

          <div class="space-y-1">
            <label class="block text-xs text-gray-500">Startdato (typisk en fredag)</label>
            <input type="date"
                   [ngModel]="setupDate()"
                   (ngModelChange)="setupDate.set($event)"
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
          </div>

          <div class="space-y-1">
            <label class="block text-xs text-gray-500">Hvem starter på denne datoen?</label>
            <div class="flex gap-2">
              <button (click)="setupLabel.set('Mamma')"
                      class="flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
                      [class]="setupLabel() === 'Mamma' ? 'bg-rose-500 text-white shadow-sm' : 'bg-gray-200 text-gray-600'">
                Mamma
              </button>
              <button (click)="setupLabel.set('Pappa')"
                      class="flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
                      [class]="setupLabel() === 'Pappa' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-200 text-gray-600'">
                Pappa
              </button>
            </div>
          </div>

          <div class="flex gap-2 pt-1">
            <button (click)="setupOpen.set(false)"
                    class="flex-1 py-2 rounded-lg text-sm text-gray-500 bg-gray-200">
              Avbryt
            </button>
            <button (click)="saveRotation()"
                    [disabled]="!setupDate()"
                    class="flex-1 py-2 rounded-lg text-sm font-semibold bg-gray-800 text-white disabled:opacity-40 active:scale-[0.98] transition-all">
              Lagre rotasjon
            </button>
          </div>
        </div>
      }

      <!-- Month navigation -->
      <div class="flex items-center justify-between">
        <button (click)="prevMonth()"
                class="p-2 rounded-xl hover:bg-gray-100 active:scale-[0.95] transition-all text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="text-sm font-semibold text-gray-700">{{ monthLabel() }}</span>
        <button (click)="nextMonth()"
                class="p-2 rounded-xl hover:bg-gray-100 active:scale-[0.95] transition-all text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <!-- Calendar grid -->
      <div class="grid grid-cols-7 gap-1">
        <!-- Day headers -->
        @for (h of dayHeaders; track h) {
          <div class="text-center text-[10px] font-semibold text-gray-400 py-1">{{ h }}</div>
        }

        <!-- Day cells -->
        @for (cell of monthGrid(); track $index) {
          @if (!cell.date) {
            <div></div>
          } @else {
            <button
              (click)="toggleCell(cell.date, cell.residency, cell.hasOverride)"
              class="relative flex items-center justify-center rounded-lg text-xs font-semibold transition-all active:scale-[0.92] aspect-square"
              [class]="cellClass(cell)">
              {{ cell.dayNum }}
              @if (cell.hasOverride) {
                <span class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400"></span>
              }
            </button>
          }
        }
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-3 text-[11px] text-gray-500">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded bg-rose-200 shrink-0"></div>
          <span>Mamma</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded bg-blue-200 shrink-0"></div>
          <span>Pappa</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-orange-400 shrink-0"></span>
          <span>Overstyrt dag</span>
        </div>
      </div>
      <p class="text-[10px] text-gray-400">Trykk på en dag for å overstyre hvem som har barna den dagen.</p>
    </div>
  `,
})
export class ResidencyPlannerComponent {
  readonly data = inject(SchoolDataService);
  readonly residency = inject(ResidencyService);

  readonly dayHeaders = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

  // Setup form state
  readonly setupOpen = signal(false);
  readonly setupDate = signal('');
  readonly setupLabel = signal<'Mamma' | 'Pappa'>('Mamma');

  // Month navigation (1-based month)
  private readonly _today = new Date();
  readonly viewYear = signal(this._today.getFullYear());
  readonly viewMonth = signal(this._today.getMonth() + 1);

  readonly monthLabel = computed(() => `${MONTH_NAMES[this.viewMonth() - 1]} ${this.viewYear()}`);

  private get todayStr(): string {
    const d = this._today;
    return (
      d.getFullYear() +
      '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0')
    );
  }

  /** Reactive grid — tracks overrides, rotation, and month. */
  readonly monthGrid = computed<GridCell[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const overrides = this.data.residencyOverrides(); // track signal
    const todayStr = this.todayStr;

    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    // In Norway weeks start Monday. getDay() returns 0=Sun, 1=Mon … 6=Sat
    const firstDOW = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // Mon=1 … Sun=7

    const cells: GridCell[] = [];

    // Blank prefix cells
    for (let i = 1; i < firstDOW; i++) {
      cells.push({ date: null, dayNum: 0, residency: null, isToday: false, hasOverride: false });
    }

    const mm = String(month).padStart(2, '0');
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${mm}-${String(d).padStart(2, '0')}`;
      cells.push({
        date: dateStr,
        dayNum: d,
        residency: this.residency.residencyForDate(dateStr), // reads signals → tracked
        isToday: dateStr === todayStr,
        hasOverride: dateStr in overrides && overrides[dateStr] !== null,
      });
    }

    // Pad to complete last row
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, dayNum: 0, residency: null, isToday: false, hasOverride: false });
    }

    return cells;
  });

  cellClass(cell: GridCell): string {
    let cls = this.residency.cellColorClass(cell.residency);
    if (cell.isToday) cls += ' ring-2 ring-gray-800';
    else if (cell.hasOverride) cls += ' ring-1 ring-inset ring-orange-400';
    return cls;
  }

  toggleCell(dateStr: string, currentResidency: 'Mamma' | 'Pappa' | null, hasOverride: boolean): void {
    if (hasOverride) {
      // Clear override → return to base rotation
      this.data.setResidencyOverride(dateStr, null);
    } else {
      // Override to the opposite of what is currently showing
      const opposite = currentResidency === 'Mamma' ? 'Pappa' : 'Mamma';
      this.data.setResidencyOverride(dateStr, opposite);
    }
  }

  prevMonth(): void {
    if (this.viewMonth() === 1) { this.viewYear.update((y) => y - 1); this.viewMonth.set(12); }
    else this.viewMonth.update((m) => m - 1);
  }

  nextMonth(): void {
    if (this.viewMonth() === 12) { this.viewYear.update((y) => y + 1); this.viewMonth.set(1); }
    else this.viewMonth.update((m) => m + 1);
  }

  openSetup(): void {
    const rot = this.data.baseRotation();
    if (rot) {
      this.setupDate.set(rot.startDate);
      this.setupLabel.set(rot.startLabel);
    } else {
      this.setupDate.set('');
      this.setupLabel.set('Mamma');
    }
    this.setupOpen.update((v) => !v);
  }

  saveRotation(): void {
    const d = this.setupDate();
    if (!d) return;
    const rotation: BaseRotation = { startDate: d, startLabel: this.setupLabel(), frequency: 'bi-weekly' };
    this.data.setBaseRotation(rotation);
    this.setupOpen.set(false);
  }

  clearRotation(): void {
    if (confirm('Fjerne den faste rotasjonsplanen? Manuelle overstyringer beholdes.')) {
      this.data.setBaseRotation(null);
    }
  }
}

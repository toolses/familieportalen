import { Component, input, output, OnInit, signal } from '@angular/core';
import { GoogleCalendarInfo, SelectedCalendar } from '../../shared/services/google-calendar.service';

const PRESET_COLORS = [
  '#4285F4', '#0F9D58', '#DB4437', '#F4B400',
  '#8B5CF6', '#EC4899', '#F97316', '#06B6D4',
  '#6366F1', '#14B8A6',
];

@Component({
  selector: 'app-calendar-picker-sheet',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-[70] flex flex-col justify-end">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="cancel()"></div>
      <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-bottom shadow-2xl space-y-4 max-h-[80vh] flex flex-col modal-sheet">
        <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto"></div>
        <h3 class="text-lg font-bold text-gray-900">{{ title() }}</h3>

        <div class="overflow-y-auto flex-1 space-y-1 -mx-1 px-1">
          @for (cal of calendars(); track cal.id) {
            @let isChecked = isSelected(cal.id);
            <div class="rounded-2xl transition-colors"
                 [class]="isChecked ? 'bg-gray-50' : ''">
              <!-- Kalender-rad -->
              <button (click)="toggle(cal)"
                      class="w-full flex items-center gap-3 p-3 text-left">
                <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                     [style.border-color]="isChecked ? colorFor(cal.id) : '#D1D5DB'"
                     [style.background]="isChecked ? colorFor(cal.id) : 'white'">
                  @if (isChecked) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  }
                </div>
                <div class="w-3 h-3 rounded-full shrink-0" [style.background]="cal.backgroundColor"></div>
                <span class="flex-1 text-sm font-medium text-gray-800">{{ cal.summary }}</span>
              </button>

              <!-- Farge-velger (kun for valgte) -->
              @if (isChecked) {
                <div class="px-3 pb-3 pt-0">
                  <p class="text-xs text-gray-400 mb-2">Farge i kalender</p>
                  <div class="flex gap-2 flex-wrap">
                    @for (color of presetColors; track color) {
                      <button (click)="setColor(cal.id, color)"
                              class="w-7 h-7 rounded-full transition-all active:scale-90"
                              [style.background]="color"
                              [class]="colorFor(cal.id) === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''">
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (calendars().length === 0) {
            <p class="text-sm text-gray-400 text-center py-6">Ingen kalendere funnet.</p>
          }
        </div>

        <div class="space-y-2 pt-1">
          <button (click)="save()"
                  class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all">
            Lagre valg
          </button>
          <button (click)="cancel()"
                  class="w-full py-3 rounded-xl font-medium text-sm text-gray-500 active:scale-[0.98] transition-all">
            Avbryt
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 1.25rem); }
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .modal-sheet { animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
  `,
})
export class CalendarPickerSheetComponent implements OnInit {
  title = input.required<string>();
  calendars = input.required<GoogleCalendarInfo[]>();
  selected = input.required<SelectedCalendar[]>();

  selectionChange = output<SelectedCalendar[]>();
  closed = output<void>();

  readonly presetColors = PRESET_COLORS;
  private draft = signal<SelectedCalendar[]>([]);

  ngOnInit(): void {
    this.draft.set([...this.selected()]);
  }

  isSelected(calId: string): boolean {
    return this.draft().some((s) => s.id === calId);
  }

  colorFor(calId: string): string {
    return this.draft().find((s) => s.id === calId)?.color ?? '#4285F4';
  }

  toggle(cal: GoogleCalendarInfo): void {
    if (this.isSelected(cal.id)) {
      this.draft.update((d) => d.filter((s) => s.id !== cal.id));
    } else {
      const usedColors = this.draft().map((s) => s.color);
      const defaultColor = PRESET_COLORS.find((c) => !usedColors.includes(c)) ?? cal.backgroundColor;
      this.draft.update((d) => [...d, { id: cal.id, color: defaultColor }]);
    }
  }

  setColor(calId: string, color: string): void {
    this.draft.update((d) => d.map((s) => (s.id === calId ? { ...s, color } : s)));
  }

  save(): void {
    this.selectionChange.emit(this.draft());
    this.closed.emit();
  }

  cancel(): void {
    this.closed.emit();
  }
}

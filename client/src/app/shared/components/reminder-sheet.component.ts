import { Component, input, output, effect, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManualReminder, AssignedTo, RecurrenceRule } from '../../features/school-plan/models/school-plan.models';
import { SchoolDataService } from '../services/school-data.service';
import { HouseholdService } from '../services/household.service';
import { formatDateFull } from '../utils/date-utils';

type AssignedToOption =
  | { type: 'parent'; role: 'Mamma' | 'Pappa' }
  | { type: 'child'; childId: string };

@Component({
  selector: 'app-reminder-sheet',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-55 flex flex-col justify-end">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="cancelled.emit()"></div>
      <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-bottom shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto modal-sheet">
        <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1"></div>
        <h3 class="text-lg font-bold text-gray-900">
          {{ reminder() ? 'Rediger påminnelse' : 'Ny påminnelse' }}
        </h3>

        <div class="space-y-3">
          <!-- Tittel -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Tittel</label>
            <input [(ngModel)]="title" placeholder="Skriv tittel..."
                   class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <!-- Beskrivelse -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Beskrivelse (valgfritt)</label>
            <textarea [(ngModel)]="description" rows="2" placeholder="Eventuell tilleggsinformasjon..."
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"></textarea>
          </div>

          <!-- Dato -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Dato</label>
            <label class="relative block w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-left bg-white focus-within:ring-2 focus-within:ring-amber-400 cursor-pointer">
              @if (date) { {{ formatDateFull(date) }} } @else { <span class="text-gray-400">––.––.––––</span> }
              <input type="date" [(ngModel)]="date"
                     class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </label>
          </div>

          <!-- Klokkeslett (valgfritt) -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Klokkeslett (valgfritt)</label>
            <label class="relative block w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-left bg-white focus-within:ring-2 focus-within:ring-amber-400 cursor-pointer">
              @if (time) { {{ time }} } @else { <span class="text-gray-400">––:––</span> }
              <input type="time" [(ngModel)]="time" (ngModelChange)="onTimeChange($event)"
                     class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </label>
          </div>

          <!-- Push-varsel -->
          <div>
            <label class="flex items-center gap-3 cursor-pointer">
              <div class="relative">
                <input type="checkbox" [(ngModel)]="notify" class="sr-only" />
                <div class="w-10 h-6 rounded-full transition-colors"
                     [class]="notify ? 'bg-amber-400' : 'bg-gray-200'">
                  <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                       [class.translate-x-4]="notify"></div>
                </div>
              </div>
              <span class="text-sm font-medium text-gray-700">Send push-varsel</span>
            </label>
          </div>

          <!-- Skolerelatert -->
          <div>
            <label class="flex items-center gap-3 cursor-pointer">
              <div class="relative">
                <input type="checkbox" [(ngModel)]="isSchoolRelated" class="sr-only" />
                <div class="w-10 h-6 rounded-full transition-colors"
                     [class]="isSchoolRelated ? 'bg-amber-400' : 'bg-gray-200'">
                  <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                       [class.translate-x-4]="isSchoolRelated"></div>
                </div>
              </div>
              <span class="text-sm font-medium text-gray-700">Skolerelatert</span>
            </label>
          </div>

          <!-- Hvem gjelder det? -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">Gjelder</label>
            <div class="flex flex-wrap gap-2">
              @for (opt of assignedOptions(); track getOptKey(opt)) {
                <button (click)="toggleAssigned(opt)"
                        class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                        [style.background]="isSelected(opt) ? getOptColor(opt) : ''"
                        [class]="isSelected(opt) ? 'text-white' : 'bg-gray-100 text-gray-600'">
                  {{ getOptLabel(opt) }}
                </button>
              }
            </div>
          </div>

          <!-- Gjentagelse -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">Gjentagelse</label>
            <div class="flex flex-wrap gap-2">
              <button (click)="recurrenceType = null"
                      class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                      [class]="recurrenceType === null ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'">
                Ingen
              </button>
              <button (click)="recurrenceType = 'weekly'"
                      class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                      [class]="recurrenceType === 'weekly' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'">
                Hver uke
              </button>
              <button (click)="recurrenceType = 'biweekly'"
                      class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                      [class]="recurrenceType === 'biweekly' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'">
                Annenhver uke
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-2 pt-1">
          <button (click)="onSave()"
                  [disabled]="!canSave()"
                  class="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
            {{ reminder() ? 'Lagre endringer' : 'Legg til påminnelse' }}
          </button>
          @if (reminder()) {
            <button (click)="deleted.emit()"
                    class="w-full py-3 rounded-xl font-medium text-sm text-red-600 bg-red-50 active:scale-[0.98] transition-all">
              Slett påminnelse
            </button>
          }
          <button (click)="cancelled.emit()"
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
export class ReminderSheetComponent {
  reminder = input<ManualReminder | null>(null);
  /** Pre-selected date when opening from the calendar (ISO date) */
  defaultDate = input<string>('');

  saved = output<Omit<ManualReminder, 'id' | 'createdAt'>>();
  deleted = output<void>();
  cancelled = output<void>();

  private data = inject(SchoolDataService);
  private household = inject(HouseholdService);
  readonly formatDateFull = formatDateFull;

  // Form state
  title = '';
  description = '';
  date = '';
  time = '';
  notify = false;
  isSchoolRelated = false;
  selectedAssigned: AssignedToOption[] = [];
  recurrenceType: 'weekly' | 'biweekly' | null = null;

  assignedOptions = computed<AssignedToOption[]>(() => {
    const opts: AssignedToOption[] = [];
    opts.push({ type: 'parent', role: 'Mamma' });
    opts.push({ type: 'parent', role: 'Pappa' });
    for (const child of this.data.children()) {
      opts.push({ type: 'child', childId: child.id });
    }
    return opts;
  });

  constructor() {
    effect(() => {
      const r = this.reminder();
      const def = this.defaultDate();
      if (r) {
        this.title = r.title;
        this.description = r.description;
        this.date = r.date;
        this.time = r.time ?? '';
        this.notify = r.notify ?? false;
        this.isSchoolRelated = r.isSchoolRelated;
        this.selectedAssigned = r.assignedTo as AssignedToOption[];
        this.recurrenceType = r.recurrence?.type ?? null;
      } else {
        this.title = '';
        this.description = '';
        this.date = def || new Date().toISOString().slice(0, 10);
        this.time = '';
        this.notify = false;
        this.isSchoolRelated = false;
        this.selectedAssigned = [];
        this.recurrenceType = null;
      }
    });
  }

  getOptKey(opt: AssignedToOption): string {
    return opt.type === 'parent' ? `parent-${opt.role}` : `child-${opt.childId}`;
  }

  getOptLabel(opt: AssignedToOption): string {
    if (opt.type === 'parent') return opt.role;
    const child = this.data.children().find((c) => c.id === opt.childId);
    return child?.name ?? 'Ukjent';
  }

  getOptColor(opt: AssignedToOption): string {
    if (opt.type === 'parent') return opt.role === 'Mamma' ? '#F43F5E' : '#3B82F6';
    const child = this.data.children().find((c) => c.id === opt.childId);
    return child?.color ?? '#6B7280';
  }

  isSelected(opt: AssignedToOption): boolean {
    return this.selectedAssigned.some((s) => this.getOptKey(s) === this.getOptKey(opt));
  }

  toggleAssigned(opt: AssignedToOption): void {
    const key = this.getOptKey(opt);
    const idx = this.selectedAssigned.findIndex((s) => this.getOptKey(s) === key);
    if (idx === -1) {
      this.selectedAssigned = [...this.selectedAssigned, opt];
    } else {
      this.selectedAssigned = this.selectedAssigned.filter((_, i) => i !== idx);
    }
  }

  onTimeChange(_value: string): void {}

  canSave(): boolean {
    return !!this.title.trim() && !!this.date && this.selectedAssigned.length > 0;
  }

  onSave(): void {
    if (!this.canSave()) return;
    const assignedTo = this.selectedAssigned as AssignedTo[];
    const recurrence: RecurrenceRule | null = this.recurrenceType
      ? { type: this.recurrenceType }
      : null;
    this.saved.emit({
      title: this.title.trim(),
      description: this.description.trim(),
      date: this.date,
      time: this.time || null,
      notify: this.notify,
      isSchoolRelated: this.isSchoolRelated,
      assignedTo,
      recurrence,
    });
  }
}

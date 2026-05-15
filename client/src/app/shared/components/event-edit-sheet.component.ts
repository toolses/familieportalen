import { Component, input, output, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolEvent } from '../../features/school-plan/models/school-plan.models';

export interface WeekDayOption {
  date: string;
  label: string;
}

@Component({
  selector: 'app-event-edit-sheet',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-55 flex flex-col justify-end">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="cancelled.emit()"></div>
      <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-bottom shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto modal-sheet">
        <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1"></div>
        <h3 class="text-lg font-bold text-gray-900">Rediger hendelse</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Tittel</label>
            <input [(ngModel)]="title"
                   class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Beskrivelse</label>
            <textarea [(ngModel)]="description" rows="4"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
            <select [(ngModel)]="category"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="school_class">Skoletime</option>
              <option value="homework">Lekse</option>
              <option value="weekly_homework">Ukelekse</option>
              <option value="reminder">Påminnelse</option>
              <option value="information">Informasjon</option>
            </select>
          </div>
          @if (weekDays().length > 0) {
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Dag</label>
              <select [(ngModel)]="date"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                @for (day of weekDays(); track day.date) {
                  <option [value]="day.date">{{ day.label }}</option>
                }
              </select>
            </div>
          }
          @if (category === 'reminder') {
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
          }
        </div>

        <div class="space-y-2 pt-1">
          @if (category === 'homework' || category === 'weekly_homework') {
            <button (click)="onToggleComplete()"
                    class="w-full py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    [class]="completed ? 'bg-gray-100 text-gray-500' : 'bg-green-500 text-white'">
              @if (completed) {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Marker som ufullført
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Fullfør
              }
            </button>
          }
          <button (click)="onSave()"
                  [disabled]="!title.trim()"
                  class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
            Lagre endringer
          </button>
          <button (click)="deleted.emit()"
                  class="w-full py-3 rounded-xl font-medium text-sm text-red-600 bg-red-50 active:scale-[0.98] transition-all">
            Slett hendelse
          </button>
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
export class EventEditSheetComponent {
  event = input.required<SchoolEvent>();
  weekDays = input<WeekDayOption[]>([]);

  saved = output<SchoolEvent>();
  deleted = output<void>();
  cancelled = output<void>();

  // Mutable form state — synced from input via effect
  title = '';
  description = '';
  category: SchoolEvent['category'] = 'homework';
  date = '';
  completed = false;
  notify = true;

  constructor() {
    effect(() => {
      const e = this.event();
      this.title = e.title;
      this.description = e.description;
      this.category = e.category;
      this.date = e.date;
      this.completed = e.completed ?? false;
      this.notify = e.notify ?? true;
    });
  }

  onToggleComplete(): void {
    this.completed = !this.completed;
    this.onSave();
  }

  onSave(): void {
    if (!this.title.trim()) return;
    this.saved.emit({
      date: this.date,
      title: this.title.trim(),
      description: this.description.trim(),
      category: this.category,
      completed: this.completed || undefined,
      notify: this.category === 'reminder' ? this.notify : undefined,
    });
  }
}

import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanMetadata, SchoolEvent } from './models/school-plan.models';

@Component({
  selector: 'app-plan-review',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">
      <!-- Header with metadata -->
      @if (metadata(); as meta) {
        <div class="bg-gray-50 rounded p-3 text-sm text-gray-600">
          <span class="font-semibold">Uke {{ meta.uke }}, {{ meta.aar }}</span>
          @if (meta.trinn) {
            <span class="ml-2">· {{ meta.trinn }}</span>
          }
        </div>
      }

      <!-- Debug toggle -->
      <button (click)="showRaw.set(!showRaw())"
              class="text-sm text-gray-500 underline">
        {{ showRaw() ? 'Skjul' : 'Vis' }} rådata fra Groq
      </button>
      @if (showRaw()) {
        <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">{{ rawResponse() }}</pre>
      }

      <!-- Events grouped by date -->
      <h3 class="text-lg font-semibold">Hendelser ({{ events().length }})</h3>
      <div class="space-y-2">
        @for (event of events(); track $index) {
          <div class="border rounded p-3" [class]="borderClass(event.category)">
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                    [class]="badgeClass(event.category)">
                {{ categoryLabel(event.category) }}
              </span>
              <span class="text-sm text-gray-500 shrink-0">
                {{ formatDate(event.date) }}
                @if (event.start_time) {
                  · {{ event.start_time }}@if (event.end_time) {–{{ event.end_time }}}
                }
              </span>
            </div>
            <div class="mt-2 space-y-1">
              <input [(ngModel)]="event.title"
                     class="w-full border rounded px-2 py-1 text-sm font-medium" />
              <textarea [(ngModel)]="event.description" rows="2"
                        class="w-full border rounded px-2 py-1 text-sm text-gray-600 resize-none"></textarea>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PlanReviewComponent {
  events = input.required<SchoolEvent[]>();
  metadata = input<PlanMetadata | null>(null);
  rawResponse = input<string>('');

  showRaw = signal(false);

  formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  badgeClass(cat: SchoolEvent['category']): string {
    const map: Record<string, string> = {
      school_class: 'bg-blue-100 text-blue-800',
      homework: 'bg-orange-100 text-orange-800',
      test: 'bg-red-100 text-red-800',
      reminder: 'bg-green-100 text-green-800',
    };
    return map[cat] ?? 'bg-gray-100';
  }

  borderClass(cat: SchoolEvent['category']): string {
    const map: Record<string, string> = {
      school_class: 'border-blue-200',
      homework: 'border-orange-200',
      test: 'border-red-200',
      reminder: 'border-green-200',
    };
    return map[cat] ?? '';
  }

  categoryLabel(cat: SchoolEvent['category']): string {
    const map: Record<string, string> = {
      school_class: 'Fag',
      homework: 'Lekse',
      test: 'Prøve',
      reminder: 'Påminnelse',
    };
    return map[cat] ?? cat;
  }
}

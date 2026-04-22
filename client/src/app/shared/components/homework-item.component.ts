import { Component, input, output } from '@angular/core';
import { SchoolEvent } from '../../features/school-plan/models/school-plan.models';

@Component({
  selector: 'app-homework-item',
  standalone: true,
  template: `
    <button
      class="w-full flex gap-3 items-start rounded-xl p-3 active:bg-white/80 transition-colors text-left"
      [class]="event().completed ? 'bg-white/30 opacity-70' : 'bg-white/60'"
      (click)="edit.emit()">

      @if (event().completed) {
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-green-500 mt-0.5 shrink-0">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      } @else if (isUkelekse()) {
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-amber-400 mt-1 shrink-0">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      } @else {
        <div class="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
      }

      <div class="flex-1 min-w-0">
        <span class="font-medium text-sm"
              [class]="event().completed ? 'text-gray-400 line-through' : 'text-gray-800'">
          {{ event().title }}
        </span>
        @if (event().description) {
          <p class="text-sm mt-0.5 whitespace-pre-wrap"
             [class]="event().completed ? 'text-gray-300' : 'text-gray-500'">
            {{ event().description }}
          </p>
        }
        @if (childName()) {
          <p class="text-[10px] font-semibold mt-1" [style.color]="childColor() ?? '#6B7280'">
            {{ childName() }}
          </p>
        }
      </div>

      @if (event().completed) {
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0 mt-0.5">Ferdig</span>
      } @else {
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0 mt-0.5">Lekse</span>
      }
    </button>
  `,
})
export class HomeworkItemComponent {
  event = input.required<SchoolEvent>();
  childName = input<string | null>(null);
  childColor = input<string | null>(null);
  edit = output<void>();

  isUkelekse = () => {
    const title = this.event().title.toLowerCase();
    return title.startsWith('ukelekse') || title.includes('hele uken');
  };
}

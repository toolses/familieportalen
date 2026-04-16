import { Component, inject, signal } from '@angular/core';
import { SchoolPlanService } from './services/school-plan.service';
import { ParseResponse, SchoolEvent, PlanMetadata } from './models/school-plan.models';
import { ImageCaptureComponent } from './image-capture.component';
import { PlanReviewComponent } from './plan-review.component';

type ViewState = 'IDLE' | 'UPLOADING' | 'REVIEW';

@Component({
  selector: 'app-school-plan',
  standalone: true,
  imports: [ImageCaptureComponent, PlanReviewComponent],
  template: `
    <div class="max-w-2xl mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4">Ukeplan-digitizer</h2>

      @switch (state()) {
        @case ('IDLE') {
          <app-image-capture (imagesReady)="onImagesReady($event)" />
        }

        @case ('UPLOADING') {
          <div class="flex flex-col items-center justify-center py-16 space-y-4">
            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-600 font-medium">AI-en leser planen din...</p>
          </div>
        }

        @case ('REVIEW') {
          <app-plan-review
            [events]="events()"
            [metadata]="metadata()"
            [rawResponse]="rawResponse()" />
          <button (click)="reset()"
                  class="mt-4 w-full border border-gray-300 text-gray-600 py-2 rounded">
            Skann ny ukeplan
          </button>
        }
      }

      @if (error()) {
        <div class="mt-4 p-3 bg-red-100 text-red-800 rounded">{{ error() }}</div>
      }
    </div>
  `,
})
export class SchoolPlanComponent {
  private service = inject(SchoolPlanService);

  state = signal<ViewState>('IDLE');
  error = signal<string | null>(null);
  events = signal<SchoolEvent[]>([]);
  metadata = signal<PlanMetadata | null>(null);
  rawResponse = signal('');

  onImagesReady(images: { front: string; back?: string }) {
    this.state.set('UPLOADING');
    this.error.set(null);

    this.service
      .parse({ frontImage: images.front, backImage: images.back })
      .subscribe({
        next: (res) => {
          this.events.set(res.data.events);
          this.metadata.set(res.data.metadata);
          this.rawResponse.set(res.raw);
          this.state.set('REVIEW');
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Noe gikk galt');
          this.state.set('IDLE');
        },
      });
  }

  reset() {
    this.state.set('IDLE');
    this.events.set([]);
    this.metadata.set(null);
    this.rawResponse.set('');
    this.error.set(null);
  }
}

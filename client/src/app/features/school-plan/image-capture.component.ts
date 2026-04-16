import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-image-capture',
  standalone: true,
  template: `
    <div class="space-y-4">
      <!-- Camera / file toggle -->
      @if (cameraAvailable()) {
        <div class="relative aspect-[4/3] bg-black rounded overflow-hidden">
          <video #videoEl autoplay playsinline class="w-full h-full object-cover"></video>
        </div>
        <div class="flex gap-2">
          @if (!frontImage()) {
            <button (click)="capture('front')"
                    class="flex-1 bg-blue-600 text-white py-2 rounded font-medium">
              Ta bilde av forside
            </button>
          } @else if (!backImage()) {
            <button (click)="capture('back')"
                    class="flex-1 bg-blue-600 text-white py-2 rounded font-medium">
              Ta bilde av bakside
            </button>
            <button (click)="skipBack()"
                    class="px-4 py-2 border rounded text-gray-600">
              Hopp over
            </button>
          }
        </div>
      } @else {
        <!-- Fallback file inputs -->
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Forside (påkrevd)</label>
            <input type="file" accept="image/*" capture="environment"
                   (change)="onFileSelect($event, 'front')"
                   class="block w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Bakside (valgfri)</label>
            <input type="file" accept="image/*" capture="environment"
                   (change)="onFileSelect($event, 'back')"
                   class="block w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white" />
          </div>
        </div>
      }

      <!-- Thumbnails -->
      @if (frontPreview() || backPreview()) {
        <div class="flex gap-3">
          @if (frontPreview()) {
            <div class="relative w-24">
              <img [src]="frontPreview()" class="w-24 h-16 object-cover rounded border" />
              <span class="text-xs text-gray-500">Forside</span>
              <button (click)="removeFront()"
                      class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-5 text-center">×</button>
            </div>
          }
          @if (backPreview()) {
            <div class="relative w-24">
              <img [src]="backPreview()" class="w-24 h-16 object-cover rounded border" />
              <span class="text-xs text-gray-500">Bakside</span>
              <button (click)="removeBack()"
                      class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-5 text-center">×</button>
            </div>
          }
        </div>
      }

      <!-- Submit -->
      @if (frontImage()) {
        <button (click)="submit()" class="w-full bg-green-600 text-white py-3 rounded font-medium text-lg">
          Analyser ukeplan
        </button>
      }

      <canvas #canvasEl class="hidden"></canvas>
    </div>
  `,
})
export class ImageCaptureComponent implements OnDestroy {
  @Output() imagesReady = new EventEmitter<{ front: string; back?: string }>();

  videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('canvasEl');

  cameraAvailable = signal(false);
  frontImage = signal<string | null>(null);
  backImage = signal<string | null>(null);
  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  private stream: MediaStream | null = null;

  constructor() {
    this.initCamera();
  }

  private async initCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      this.cameraAvailable.set(true);
      // Wait for viewChild to be available
      setTimeout(() => {
        const video = this.videoEl()?.nativeElement;
        if (video) video.srcObject = this.stream;
      });
    } catch {
      this.cameraAvailable.set(false);
    }
  }

  capture(side: 'front' | 'back') {
    const video = this.videoEl()?.nativeElement;
    const canvas = this.canvasEl()?.nativeElement;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];

    if (side === 'front') {
      this.frontImage.set(base64);
      this.frontPreview.set(dataUrl);
    } else {
      this.backImage.set(base64);
      this.backPreview.set(dataUrl);
    }
  }

  onFileSelect(event: Event, side: 'front' | 'back') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64 = dataUrl.split(',')[1];

      if (side === 'front') {
        this.frontImage.set(base64);
        this.frontPreview.set(dataUrl);
      } else {
        this.backImage.set(base64);
        this.backPreview.set(dataUrl);
      }
    };
    img.src = URL.createObjectURL(file);
  }

  skipBack() {
    // User chose not to take back image — ready to submit
  }

  removeFront() {
    this.frontImage.set(null);
    this.frontPreview.set(null);
    this.backImage.set(null);
    this.backPreview.set(null);
  }

  removeBack() {
    this.backImage.set(null);
    this.backPreview.set(null);
  }

  submit() {
    const front = this.frontImage();
    if (!front) return;
    this.imagesReady.emit({
      front,
      ...(this.backImage() ? { back: this.backImage()! } : {}),
    });
  }

  ngOnDestroy() {
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}

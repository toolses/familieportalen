import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { preprocessImageForAI } from '../../shared/utils/image-utils';

type CaptureStep = 'idle' | 'front' | 'back' | 'processing';

@Component({
  selector: 'app-image-capture',
  standalone: true,
  template: `
    <div class="relative min-h-[70vh] flex flex-col bg-gray-50 rounded-2xl overflow-hidden">

      <!-- Hidden elements -->
      <canvas #canvasEl class="hidden"></canvas>
      <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)" />

      <!-- Processing overlay -->
      @if (step() === 'processing') {
        <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 rounded-2xl">
          <div class="flex gap-4 mb-8">
            @if (frontPreview()) {
              <div class="relative">
                <img [src]="frontPreview()" alt="Ukeplan" class="w-24 h-24 object-cover rounded-xl opacity-60" />
                <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">Ukeplan</span>
              </div>
            }
            @if (backPreview()) {
              <div class="relative">
                <img [src]="backPreview()" alt="Timeplan" class="w-24 h-24 object-cover rounded-xl opacity-60" />
                <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">Timeplan</span>
              </div>
            }
          </div>
          <div class="w-14 h-14 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-5"></div>
          <p class="text-xl font-semibold text-gray-800 mb-1">Analyserer ukeplan...</p>
          <p class="text-gray-500 text-sm">AI-en leser planen din</p>
          <div class="mt-5 w-48 h-1 rounded-full overflow-hidden bg-gray-200">
            <div class="h-full bg-blue-600 rounded-full animate-pulse" style="width: 60%"></div>
          </div>
        </div>
      }

      <!-- Camera / Capture flow -->
      @if (step() !== 'processing') {
        <div class="flex-1 relative">

          @if (cameraActive()) {
            <!-- Live camera feed — full view, no crop overlay -->
            <video #videoEl autoplay playsinline muted class="absolute inset-0 w-full h-full object-cover"></video>

            <!-- Step indicator -->
            <div class="absolute top-4 left-0 right-0 text-center z-20">
              <div class="inline-block bg-black/50 backdrop-blur-sm rounded-full px-4 py-1">
                @if (step() === 'front') {
                  <p class="text-white text-sm font-medium">📄 Hold telefonen rett over arket og ta bilde</p>
                } @else {
                  <p class="text-white text-sm font-medium">📄 Hold telefonen rett over arket og ta bilde</p>
                }
              </div>
            </div>

            <!-- Document alignment overlay -->
            <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div class="w-[80%] h-[85%] border-2 border-white/60 rounded-lg"
                   style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.25);">
                <!-- Corner markers -->
                <div class="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-md"></div>
                <div class="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-md"></div>
                <div class="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-md"></div>
                <div class="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-md"></div>
              </div>
            </div>

            <!-- Thumbnails overlay (top) -->
            @if (frontPreview() || backPreview()) {
              <div class="absolute top-4 left-0 right-0 flex justify-center gap-3 z-20">
                @if (frontPreview()) {
                  <div class="relative group">
                    <img [src]="frontPreview()" alt="Ukeplan" class="w-14 h-14 object-cover rounded-lg border-2 border-blue-400/60" />
                    <span class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-full">Ukeplan</span>
                    <button (click)="retakeFront(); startCamera()" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]" aria-label="Fjern ukeplan-bilde">✕</button>
                  </div>
                }
                @if (backPreview()) {
                  <div class="relative group">
                    <img [src]="backPreview()" alt="Timeplan" class="w-14 h-14 object-cover rounded-lg border-2 border-blue-400/60" />
                    <span class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-full">Timeplan</span>
                    <button (click)="retakeBack()" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]" aria-label="Fjern timeplan-bilde">✕</button>
                  </div>
                } @else {
                  <div class="w-14 h-14 rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center">
                    <span class="text-[9px] text-white/50">Timeplan</span>
                  </div>
                }
              </div>
            }

            <!-- Camera controls bar -->
            <div class="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 py-5 z-20" style="background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)">
              <button (click)="triggerFileInput()" class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors" aria-label="Velg fra galleri">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              </button>
              <button (click)="capturePhoto()" [disabled]="capturing()" class="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50 shadow-lg" aria-label="Ta bilde">
                <div class="w-12 h-12 rounded-full border-4 border-gray-800 bg-white"></div>
              </button>
              <div class="w-11 h-11"></div>
            </div>

          } @else {
            <!-- Idle / Review state -->
            <div class="flex-1 h-full flex flex-col items-center justify-center px-6 py-10 text-center">

              <!-- Thumbnails (shown in all non-camera states when images exist) -->
              @if (frontPreview() || backPreview()) {
                <div class="flex gap-4 mb-6">
                  @if (frontPreview()) {
                    <div class="relative group">
                      <img [src]="frontPreview()" alt="Ukeplan" class="w-28 h-28 object-cover rounded-2xl border-2 border-blue-300" />
                      <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">Ukeplan</span>
                      <button (click)="retakeFront()" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs" aria-label="Fjern ukeplan-bilde">✕</button>
                    </div>
                  }
                  @if (backPreview()) {
                    <div class="relative group">
                      <img [src]="backPreview()" alt="Timeplan" class="w-28 h-28 object-cover rounded-2xl border-2 border-blue-300" />
                      <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">Timeplan</span>
                      <button (click)="retakeBack()" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs" aria-label="Fjern timeplan-bilde">✕</button>
                    </div>
                  } @else if (step() === 'back') {
                    <div class="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                      <svg class="w-8 h-8 mb-1 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span class="text-[10px]">Timeplan</span>
                    </div>
                  }
                </div>

                @if (step() === 'back' && !backPreview()) {
                  <p class="text-gray-800 font-semibold text-lg mb-1">Ukeplan tatt!</p>
                  <p class="text-gray-500 text-sm mb-6">Vil du også legge til timeplanen?</p>
                }
              }

              @if (cameraError() && !frontPreview()) {
                <div class="text-5xl mb-4">📷</div>
                <p class="text-gray-800 font-semibold text-lg mb-1">Kamera utilgjengelig</p>
                <p class="text-gray-500 text-sm mb-6">{{ cameraError() }}</p>
              } @else if (step() === 'idle' && !frontPreview()) {
                <div class="text-5xl mb-5">📸</div>
                <p class="text-gray-800 font-semibold text-xl mb-1">Klar til å skanne</p>
                <p class="text-gray-500 text-sm mb-8">Ta bilde av ukeplanen og eventuelt timeplanen</p>
              } @else {
              }

              <!-- Action buttons -->
              <div class="flex flex-col gap-3 w-full max-w-sm">
                @if (step() === 'idle') {
                  @if (!cameraError()) {
                    <button (click)="startCamera()" class="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-semibold transition-all active:scale-[0.98] hover:bg-blue-700">
                      Ta bilde av ukeplanen
                    </button>
                    <button (click)="triggerFileInput()" class="w-full py-3.5 rounded-2xl border border-gray-300 text-gray-700 font-medium transition-all active:scale-[0.98] hover:bg-gray-100">
                      Velg ukeplanen fra galleri
                    </button>
                  } @else {
                    <button (click)="triggerFileInput()" class="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-semibold transition-all active:scale-[0.98] hover:bg-blue-700">
                      Velg ukeplanen fra galleri
                    </button>
                  }
                }

                @if (step() === 'back' && !cameraActive()) {
                  @if (!backPreview()) {
                    @if (!cameraError()) {
                      <button (click)="startCameraForBack()" class="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-semibold transition-all active:scale-[0.98] hover:bg-blue-700">
                        Ta bilde av timeplanen
                      </button>
                      <button (click)="triggerFileInput()" class="w-full py-3.5 rounded-2xl border border-gray-300 text-gray-700 font-medium transition-all active:scale-[0.98] hover:bg-gray-100">
                        Velg timeplan fra galleri
                      </button>
                    } @else {
                      <button (click)="triggerFileInput()" class="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-semibold transition-all active:scale-[0.98] hover:bg-blue-700">
                        Velg timeplan fra galleri
                      </button>
                    }
                    <button (click)="skipBack()" class="w-full py-3 text-gray-500 font-medium text-sm transition-all active:scale-[0.98] hover:text-gray-700">
                      Hopp over – analyser kun ukeplanen
                    </button>
                  } @else {
                    <button (click)="submitImages()" class="w-full py-3.5 rounded-2xl bg-green-600 text-white font-semibold transition-all active:scale-[0.98] hover:bg-green-700">
                      Analyser planene
                    </button>
                  }
                }
              </div>

            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ImageCaptureComponent implements OnDestroy {
  @Output() imagesReady = new EventEmitter<{ front: string; back?: string; frontPreview: string; backPreview?: string }>();

  videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('canvasEl');
  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  step = signal<CaptureStep>('idle');
  cameraActive = signal(false);
  cameraError = signal<string | null>(null);
  capturing = signal(false);

  frontImage = signal<string | null>(null);
  backImage = signal<string | null>(null);
  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  private stream: MediaStream | null = null;
  private fileInputTarget: 'front' | 'back' = 'front';

  constructor() {
    this.checkCameraAvailability();
  }

  private async checkCameraAvailability() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((d) => d.kind === 'videoinput');
      if (!hasCamera) {
        this.cameraError.set('Ingen kamera funnet på enheten.');
      }
    } catch {
      this.cameraError.set('Kunne ikke sjekke kameratilgang.');
    }
  }

  async startCamera() {
    try {
      this.cameraError.set(null);
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 4096 },
          height: { ideal: 3072 },
        },
      });
      // Request continuous autofocus for sharp document capture (best-effort)
      const track = this.stream.getVideoTracks()[0];
      if (track) {
        try {
          await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        } catch { /* not supported on all browsers */ }
      }
      this.cameraActive.set(true);
      if (this.step() === 'idle') this.step.set('front');
      setTimeout(() => {
        const video = this.videoEl()?.nativeElement;
        if (video) video.srcObject = this.stream;
      });
    } catch {
      this.cameraActive.set(false);
      this.cameraError.set('Kunne ikke åpne kameraet. Bruk galleri-knappen i stedet.');
    }
  }

  startCameraForBack() {
    this.step.set('back');
    this.startCamera();
  }

  private stopCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.cameraActive.set(false);
  }

  capturePhoto() {
    const video = this.videoEl()?.nativeElement;
    const canvas = this.canvasEl()?.nativeElement;
    if (!video || !canvas) return;

    this.capturing.set(true);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1];

    if (this.step() === 'front') {
      this.frontImage.set(base64);
      this.frontPreview.set(dataUrl);
      this.stopCamera();
      this.step.set('back');
    } else {
      this.backImage.set(base64);
      this.backPreview.set(dataUrl);
      this.stopCamera();
    }
    this.capturing.set(false);
  }

  triggerFileInput() {
    this.fileInputTarget = this.step() === 'back' ? 'back' : 'front';
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const side = this.fileInputTarget;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64 = dataUrl.split(',')[1];
      URL.revokeObjectURL(img.src);

      if (side === 'front') {
        this.frontImage.set(base64);
        this.frontPreview.set(dataUrl);
        this.step.set('back');
      } else {
        this.backImage.set(base64);
        this.backPreview.set(dataUrl);
      }
    };
    img.src = URL.createObjectURL(file);
    // Reset input so the same file can be re-selected
    (event.target as HTMLInputElement).value = '';
  }

  retakeFront() {
    this.frontImage.set(null);
    this.frontPreview.set(null);
    this.backImage.set(null);
    this.backPreview.set(null);
    this.step.set('idle');
  }

  retakeBack() {
    this.backImage.set(null);
    this.backPreview.set(null);
  }

  skipBack() {
    this.submitImages();
  }

  async submitImages() {
    const front = this.frontImage();
    if (!front) return;
    this.step.set('processing');

    // Preprocess images for AI (grayscale + contrast boost) without touching the previews
    const [frontAI, backAI] = await Promise.all([
      preprocessImageForAI(front),
      this.backImage() ? preprocessImageForAI(this.backImage()!) : Promise.resolve(undefined),
    ]);

    this.imagesReady.emit({
      front: frontAI,
      ...(backAI ? { back: backAI } : {}),
      frontPreview: this.frontPreview()!,
      ...(this.backPreview() ? { backPreview: this.backPreview()! } : {}),
    });
  }

  /** Called by parent when API returns error to allow retry */
  resetToIdle() {
    this.step.set('idle');
    this.frontImage.set(null);
    this.frontPreview.set(null);
    this.backImage.set(null);
    this.backPreview.set(null);
  }

  ngOnDestroy() {
    this.stopCamera();
  }
}

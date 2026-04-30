import { Component, output, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { DocumentService } from './services/document.service';
import { DocumentCategory, DOCUMENT_CATEGORIES } from './models/document.models';
import { AssignedTo } from '../school-plan/models/school-plan.models';
import { SchoolDataService } from '../../shared/services/school-data.service';

type AssignedToOption =
  | { type: 'parent'; role: 'Mamma' | 'Pappa' }
  | { type: 'child'; childId: string };

type UploadMode = 'select' | 'scan' | 'import' | 'form';

interface CapturedPage {
  dataUrl: string;
  thumbUrl: string;
}

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center"
         (click)="onBackdropClick($event)">
      <div class="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden"
           style="max-height: 92dvh; display: flex; flex-direction: column;"
           (click)="$event.stopPropagation()">

        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-1 shrink-0">
          <div class="w-10 h-1 rounded-full bg-gray-200"></div>
        </div>

        @switch (mode()) {

          <!-- MODE: SELECT -->
          @case ('select') {
            <div class="px-5 pb-8 pt-2 space-y-3">
              <h2 class="text-lg font-bold text-gray-900">Legg til dokument</h2>
              <button (click)="mode.set('scan')"
                      class="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors text-left">
                <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Skann dokument</p>
                  <p class="text-sm text-gray-500">Ta bilde av 1 eller flere sider</p>
                </div>
              </button>
              <label for="doc-file-input"
                     class="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors text-left cursor-pointer">
                <div class="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/></svg>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Importer dokument</p>
                  <p class="text-sm text-gray-500">PDF eller bilder fra enheten</p>
                </div>
              </label>
              <input id="doc-file-input" type="file" accept=".pdf,image/*" multiple class="hidden"
                     (change)="onFileSelected($event)" />
              <button (click)="cancelled.emit()"
                      class="w-full text-center text-sm text-gray-400 py-2">Avbryt</button>
            </div>
          }

          <!-- MODE: SCAN (multi-page camera) -->
          @case ('scan') {
            <div class="flex flex-col overflow-hidden" style="max-height: 85dvh">
              <div class="px-5 pt-3 pb-4 shrink-0">
                <div class="flex items-center gap-3 mb-4">
                  <button (click)="mode.set('select')" class="text-gray-400 active:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <h2 class="text-lg font-bold text-gray-900">Skann dokument</h2>
                </div>

                @if (scannedPages().length > 0) {
                  <div class="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                    @for (page of scannedPages(); track $index) {
                      <div class="relative shrink-0">
                        <img [src]="page.thumbUrl" alt="Side {{ $index + 1 }}"
                             class="w-16 h-20 object-cover rounded-lg border-2 border-gray-200" />
                        <button (click)="removePage($index)"
                                class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none">
                          ×
                        </button>
                        <span class="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white rounded px-1">{{ $index + 1 }}</span>
                      </div>
                    }
                  </div>
                }

                <label class="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-2xl font-medium active:bg-blue-700 transition-colors cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  {{ scannedPages().length === 0 ? 'Ta bilde av første side' : 'Ta bilde av neste side' }}
                  <input type="file" accept="image/*" capture="environment" class="hidden"
                         (change)="onCameraCapture($event)" />
                </label>
              </div>

              @if (scannedPages().length > 0) {
                <div class="px-5 pb-6 shrink-0">
                  <button (click)="proceedToForm('scan')"
                          class="w-full py-3 bg-gray-900 text-white rounded-2xl font-medium active:bg-gray-700 transition-colors">
                    Gå videre med {{ scannedPages().length }} side{{ scannedPages().length > 1 ? 'r' : '' }}
                  </button>
                </div>
              }
            </div>
          }

          <!-- MODE: IMPORT (single image — convert offer) -->
          @case ('import') {
            <div class="px-5 pb-8 pt-3 space-y-4">
              <h2 class="text-lg font-bold text-gray-900">Konverter til PDF?</h2>
              <p class="text-sm text-gray-500">
                Du har valgt et bilde. Vil du konvertere det til PDF slik at det vises likt som andre dokumenter?
              </p>
              <div class="flex flex-col gap-2">
                <button (click)="proceedToForm('convert')"
                        class="w-full py-3 bg-blue-600 text-white rounded-2xl font-medium active:bg-blue-700 transition-colors">
                  Konverter til PDF
                </button>
                <button (click)="proceedToForm('image')"
                        class="w-full py-3 border border-gray-200 text-gray-700 rounded-2xl font-medium active:bg-gray-50 transition-colors">
                  Lagre som bilde
                </button>
              </div>
            </div>
          }

          <!-- MODE: FORM (title, category, members, upload) -->
          @case ('form') {
            <div class="flex flex-col overflow-hidden" style="max-height: 85dvh">
              <div class="px-5 pt-3 pb-4 flex-1 overflow-y-auto space-y-4">
                <div class="flex items-center gap-3">
                  <button (click)="backFromForm()" class="text-gray-400 active:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <h2 class="text-lg font-bold text-gray-900">Dokumentdetaljer</h2>
                </div>

                <!-- Preview -->
                @if (previewUrl()) {
                  <img [src]="previewUrl()!" alt="Forhandsvisning"
                       class="w-full max-h-40 object-contain rounded-xl border border-gray-100 bg-gray-50" />
                }
                @if (selectedFile() && selectedFile()!.type === 'application/pdf') {
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-500 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h.01M12 15h.01M15 15h.01"/></svg>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-800 truncate">{{ selectedFile()!.name }}</p>
                      <p class="text-xs text-gray-400">{{ formatSize(selectedFile()!.size) }}</p>
                    </div>
                  </div>
                }
                @if (scannedPages().length > 0) {
                  <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    @for (page of scannedPages(); track $index) {
                      <img [src]="page.thumbUrl" alt="Side {{ $index + 1 }}"
                           class="w-14 h-18 object-cover rounded-lg border border-gray-200 shrink-0" />
                    }
                  </div>
                }

                <div class="space-y-4">
                  <!-- Title -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tittel</label>
                    <input type="text" [(ngModel)]="formTitle" placeholder="Navn på dokumentet"
                           class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>

                  <!-- Category -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                    <div class="flex flex-wrap gap-2">
                      @for (cat of categories; track cat.key) {
                        <button (click)="formCategory = cat.key"
                                class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                                [class]="formCategory === cat.key
                                  ? 'bg-gray-900 text-white'
                                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'">
                          {{ cat.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Tagging -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Hvem gjelder dokumentet?</label>
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
                </div>
              </div>

              <!-- Upload bar and button -->
              <div class="px-5 pb-8 pt-3 shrink-0 border-t border-gray-100 space-y-3">
                @if (uploadError()) {
                  <p class="text-sm text-red-600 text-center">{{ uploadError() }}</p>
                }
                @if (uploading()) {
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                         [style.width.%]="uploadPercent()"></div>
                  </div>
                }
                <button (click)="startUpload()"
                        [disabled]="!formTitle.trim() || uploading()"
                        class="w-full py-3 bg-blue-600 text-white rounded-2xl font-medium transition-all disabled:opacity-50 active:scale-[0.98]">
                  @if (uploading()) {
                    <span class="inline-flex items-center gap-2 justify-center">
                      <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Laster opp {{ uploadPercent() }}%…
                    </span>
                  } @else {
                    Last opp dokument
                  }
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`,
})
export class DocumentUploadComponent {
  private docService = inject(DocumentService);
  private data = inject(SchoolDataService);

  cancelled = output<void>();
  uploaded = output<void>();

  mode = signal<UploadMode>('select');
  scannedPages = signal<CapturedPage[]>([]);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  uploadPercent = signal(0);
  uploadError = signal<string | null>(null);
  selectedAssigned: AssignedToOption[] = [];

  formTitle = '';
  formCategory: DocumentCategory = 'annet';
  categories = DOCUMENT_CATEGORIES;

  assignedOptions = computed<AssignedToOption[]>(() => {
    const opts: AssignedToOption[] = [
      { type: 'parent', role: 'Mamma' },
      { type: 'parent', role: 'Pappa' },
    ];
    for (const child of this.data.children()) {
      opts.push({ type: 'child', childId: child.id });
    }
    return opts;
  });

  private importMode: 'convert' | 'image' | null = null;

  getOptKey(opt: AssignedToOption): string {
    return opt.type === 'parent' ? `parent-${opt.role}` : `child-${opt.childId}`;
  }

  getOptLabel(opt: AssignedToOption): string {
    if (opt.type === 'parent') return opt.role;
    return this.data.children().find((c) => c.id === opt.childId)?.name ?? 'Ukjent';
  }

  getOptColor(opt: AssignedToOption): string {
    if (opt.type === 'parent') return opt.role === 'Mamma' ? '#F43F5E' : '#3B82F6';
    return this.data.children().find((c) => c.id === opt.childId)?.color ?? '#6B7280';
  }

  isSelected(opt: AssignedToOption): boolean {
    return this.selectedAssigned.some((s) => this.getOptKey(s) === this.getOptKey(opt));
  }

  toggleAssigned(opt: AssignedToOption): void {
    const key = this.getOptKey(opt);
    const idx = this.selectedAssigned.findIndex((s) => this.getOptKey(s) === key);
    if (idx >= 0) {
      this.selectedAssigned = this.selectedAssigned.filter((_, i) => i !== idx);
    } else {
      this.selectedAssigned = [...this.selectedAssigned, opt];
    }
  }

  private toAssignedTo(opts: AssignedToOption[]): AssignedTo[] {
    return opts.map((o) =>
      o.type === 'parent' ? { type: 'parent', role: o.role } : { type: 'child', childId: o.childId }
    );
  }

  onBackdropClick(_e: Event) {
    if (!this.uploading()) this.cancelled.emit();
  }

  onFileSelected(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (files.length === 0) return;

    if (files.length > 1) {
      // Multiple files — treat as multi-page image import → convert to PDF
      if (files.every((f) => f.type.startsWith('image/'))) {
        Promise.all(files.map((f) => this.fileToDataUrl(f))).then((dataUrls) => {
          this.scannedPages.set(dataUrls.map((url) => ({ dataUrl: url, thumbUrl: url })));
          this.selectedFile.set(null);
          this.previewUrl.set(null);
          this.proceedToForm('scan');
        });
      }
      return;
    }

    const file = files[0];
    this.selectedFile.set(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
      this.mode.set('import');
    } else {
      this.previewUrl.set(null);
      this.proceedToForm('pdf');
    }
  }

  onCameraCapture(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.scannedPages.update((pages) => [...pages, { dataUrl, thumbUrl: dataUrl }]);
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  removePage(index: number) {
    this.scannedPages.update((pages) => pages.filter((_, i) => i !== index));
  }

  proceedToForm(source: 'scan' | 'convert' | 'image' | 'pdf') {
    this.importMode = source === 'convert' ? 'convert' : source === 'image' ? 'image' : null;
    this.mode.set('form');
  }

  backFromForm() {
    if (this.scannedPages().length > 0) {
      this.mode.set('scan');
    } else if (this.selectedFile()?.type.startsWith('image/')) {
      this.mode.set('import');
    } else {
      this.mode.set('select');
    }
  }

  async startUpload() {
    if (!this.formTitle.trim() || this.uploading()) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadPercent.set(0);

    let blob: Blob;
    let mimeType: string;
    let fileName: string;

    try {
      if (this.scannedPages().length > 0) {
        blob = await this.pagesToPdf(this.scannedPages().map((p) => p.dataUrl));
        mimeType = 'application/pdf';
        fileName = `${this.formTitle.trim()}.pdf`;
      } else if (this.selectedFile()) {
        const file = this.selectedFile()!;
        if (this.importMode === 'convert' && file.type.startsWith('image/')) {
          const dataUrl = await this.fileToDataUrl(file);
          blob = await this.pagesToPdf([dataUrl]);
          mimeType = 'application/pdf';
          fileName = `${this.formTitle.trim()}.pdf`;
        } else {
          blob = file;
          mimeType = file.type;
          fileName = file.name;
        }
      } else {
        this.uploadError.set('Ingen fil valgt.');
        this.uploading.set(false);
        return;
      }
    } catch {
      this.uploadError.set('Kunne ikke klargjøre dokumentet for opplasting.');
      this.uploading.set(false);
      return;
    }

    this.docService.upload(
      blob,
      fileName,
      mimeType,
      this.formTitle.trim(),
      this.formCategory,
      this.toAssignedTo(this.selectedAssigned),
      (progress) => {
        this.uploadPercent.set(progress.percent);
        if (progress.done) {
          this.uploading.set(false);
          if (progress.error) {
            this.uploadError.set(progress.error);
          } else {
            this.uploaded.emit();
          }
        }
      },
    );
  }

  private async pagesToPdf(dataUrls: string[]): Promise<Blob> {
    const first = await this.loadImage(dataUrls[0]);
    const landscape = first.width > first.height;
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm' });

    for (let i = 0; i < dataUrls.length; i++) {
      if (i > 0) pdf.addPage();
      const img = await this.loadImage(dataUrls[i]);
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / img.width, ph / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      pdf.addImage(dataUrls[i], 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'FAST');
    }

    return pdf.output('blob');
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

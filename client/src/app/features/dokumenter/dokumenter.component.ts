import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from './services/document.service';
import { DocumentUploadComponent } from './document-upload.component';
import { ArchiveDocument, DOCUMENT_CATEGORIES, DocumentCategory } from './models/document.models';
import { AssignedTo } from '../school-plan/models/school-plan.models';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { HouseholdService } from '../../shared/services/household.service';
import { AuthService } from '../../shared/services/auth.service';

type AssignedToOption =
  | { type: 'parent'; role: 'Mamma' | 'Pappa' }
  | { type: 'child'; childId: string };

@Component({
  selector: 'app-dokumenter',
  standalone: true,
  imports: [DocumentUploadComponent],
  template: `
    <!-- Header -->
    <div class="flex items-center justify-between px-4 pt-4 pb-2">
      <h2 class="text-lg font-bold text-gray-800">Arkiv</h2>
      <button (click)="showUpload.set(true)"
              class="flex items-center gap-1.5 text-sm text-blue-600 font-medium active:opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        Legg til
      </button>
    </div>

    <div class="px-4 pb-6 space-y-3">
      <!-- Category filter -->
      <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        <button (click)="activeFilter.set(null)"
                class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                [class]="activeFilter() === null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'">
          Alle
        </button>
        @for (cat of categories; track cat.key) {
          <button (click)="activeFilter.set(cat.key)"
                  class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  [class]="activeFilter() === cat.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'">
            {{ cat.label }}
          </button>
        }
      </div>

      <!-- Person filter -->
      @if (assignedOptions().length > 0) {
        <div class="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <button (click)="assignedFilter.set(null)"
                  class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  [class]="assignedFilter() === null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'">
            Alle
          </button>
          @for (opt of assignedOptions(); track getOptKey(opt)) {
            <button (click)="assignedFilter.set(opt)"
                    class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    [style.background]="assignedFilter() && getOptKey(assignedFilter()!) === getOptKey(opt) ? getOptColor(opt) : ''"
                    [class]="assignedFilter() && getOptKey(assignedFilter()!) === getOptKey(opt) ? 'text-white' : 'bg-gray-100 text-gray-600'">
              {{ getOptLabel(opt) }}
            </button>
          }
        </div>
      }

      <!-- Loading -->
      @if (docService.loading()) {
        <div class="flex justify-center py-12">
          <div class="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      } @else if (filtered().length === 0) {
        <!-- Empty state -->
        <div class="flex flex-col items-center py-14 text-center text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 text-gray-300"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p class="text-sm">Ingen dokumenter ennå</p>
          <button (click)="showUpload.set(true)"
                  class="mt-3 text-sm text-blue-600 font-medium">
            Legg til ditt første dokument
          </button>
        </div>
      } @else {
        <!-- Document list -->
        <div class="space-y-2">
          @for (doc of filtered(); track doc.id) {
            <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
              <!-- Icon -->
              <div class="w-10 h-12 rounded-lg flex items-center justify-center shrink-0"
                   [class]="iconBg(doc.category)">
                @if (doc.mimeType === 'application/pdf') {
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h.01M12 15h.01M15 15h.01"/></svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                }
              </div>

              <!-- Info -->
              <button class="flex-1 min-w-0 text-left" (click)="openDocument(doc)">
                <p class="font-semibold text-gray-800 text-sm leading-snug">{{ doc.title }}</p>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        [class]="categoryColor(doc.category)">
                    {{ categoryLabel(doc.category) }}
                  </span>
                  <span class="text-[11px] text-gray-400">{{ formatDate(doc.uploadedAt) }}</span>
                  <span class="text-[11px] text-gray-400">· {{ doc.uploadedByName }}</span>
                </div>
                <!-- Assigned tags -->
                @if (doc.assignedTo?.length) {
                  <div class="flex items-center gap-1 mt-1.5 flex-wrap">
                    @for (tag of doc.assignedTo; track $index) {
                      <span class="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-md"
                            [style.background]="getTagStyle(tag)">
                        {{ getTagLabel(tag) }}
                      </span>
                    }
                  </div>
                }
                <p class="text-[11px] text-gray-400 mt-0.5">{{ formatSize(doc.fileSizeBytes) }}</p>
              </button>

              <!-- Delete (only uploader or admin) -->
              @if (canDelete(doc)) {
                <button (click)="confirmDelete(doc)"
                        class="text-gray-300 hover:text-red-400 transition-colors active:scale-90 shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- PDF / image viewer overlay -->
    @if (viewingDoc()) {
      <div class="fixed inset-0 z-[60] bg-black flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 bg-black/80">
          <p class="text-white font-medium text-sm truncate flex-1 mr-4">{{ viewingDoc()!.title }}</p>
          <button (click)="viewingDoc.set(null)"
                  class="text-white/80 hover:text-white p-2 -mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>

        @if (viewingDoc()!.mimeType === 'application/pdf') {
          <iframe [src]="safeUrl(viewingDoc()!.fileUrl)"
                  class="flex-1 w-full border-0 bg-gray-100"
                  title="{{ viewingDoc()!.title }}">
          </iframe>
          <div class="bg-black/80 px-4 py-3 flex justify-center">
            <a [href]="viewingDoc()!.fileUrl" target="_blank" rel="noopener noreferrer"
               class="text-sm text-blue-400 underline">
              Åpne i ny fane
            </a>
          </div>
        } @else {
          <div class="flex-1 flex items-center justify-center p-4">
            <img [src]="viewingDoc()!.fileUrl" [alt]="viewingDoc()!.title"
                 class="max-w-full max-h-full object-contain" />
          </div>
        }
      </div>
    }

    <!-- Delete confirmation -->
    @if (deletingDoc()) {
      <div class="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4"
           (click)="deletingDoc.set(null)">
        <div class="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" (click)="$event.stopPropagation()">
          <h3 class="text-base font-bold text-gray-900 mb-2">Slett dokument?</h3>
          <p class="text-sm text-gray-500 mb-5">
            «{{ deletingDoc()!.title }}» vil bli permanent slettet og kan ikke gjenopprettes.
          </p>
          <div class="flex gap-3">
            <button (click)="deletingDoc.set(null)"
                    class="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">
              Avbryt
            </button>
            <button (click)="doDelete()"
                    [disabled]="deleting()"
                    class="flex-1 py-2.5 bg-red-500 rounded-xl text-sm font-medium text-white disabled:opacity-60">
              @if (deleting()) { Sletter… } @else { Slett }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Upload sheet -->
    @if (showUpload()) {
      <app-document-upload
        (cancelled)="showUpload.set(false)"
        (uploaded)="onUploaded()" />
    }
  `,
  styles: `.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`,
})
export class DokumenterComponent {
  docService = inject(DocumentService);
  private data = inject(SchoolDataService);
  private household = inject(HouseholdService);
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  showUpload = signal(false);
  viewingDoc = signal<ArchiveDocument | null>(null);
  deletingDoc = signal<ArchiveDocument | null>(null);
  deleting = signal(false);
  activeFilter = signal<DocumentCategory | null>(null);
  assignedFilter = signal<AssignedToOption | null>(null);

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

  getTagStyle(tag: AssignedTo): string {
    if (tag.type === 'parent') return tag.role === 'Mamma' ? '#F43F5E' : '#3B82F6';
    return this.data.children().find((c) => c.id === tag.childId)?.color ?? '#6B7280';
  }

  getTagLabel(tag: AssignedTo): string {
    if (tag.type === 'parent') return tag.role;
    return this.data.children().find((c) => c.id === tag.childId)?.name ?? 'Ukjent';
  }

  filtered = computed(() => {
    const catFilter = this.activeFilter();
    const af = this.assignedFilter();
    const afKey = af ? this.getOptKey(af) : null;
    return this.docService.documents().filter((d) => {
      if (catFilter && d.category !== catFilter) return false;
      if (afKey) {
        const matches = (d.assignedTo ?? []).some((t) => {
          const tKey = t.type === 'parent' ? `parent-${t.role}` : `child-${t.childId}`;
          return tKey === afKey;
        });
        if (!matches) return false;
      }
      return true;
    });
  });

  canDelete(doc: ArchiveDocument): boolean {
    const uid = this.auth.user()?.uid;
    if (!uid) return false;
    return doc.uploadedBy === uid || this.household.isAdmin();
  }

  openDocument(doc: ArchiveDocument) {
    this.viewingDoc.set(doc);
  }

  confirmDelete(doc: ArchiveDocument) {
    this.deletingDoc.set(doc);
  }

  async doDelete() {
    const doc = this.deletingDoc();
    if (!doc) return;
    this.deleting.set(true);
    await this.docService.deleteDocument(doc);
    this.deleting.set(false);
    this.deletingDoc.set(null);
  }

  onUploaded() {
    this.showUpload.set(false);
  }

  safeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  categoryLabel(cat: DocumentCategory): string {
    return DOCUMENT_CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
  }

  categoryColor(cat: DocumentCategory): string {
    return DOCUMENT_CATEGORIES.find((c) => c.key === cat)?.color ?? 'bg-gray-100 text-gray-600';
  }

  iconBg(cat: DocumentCategory): string {
    const map: Record<DocumentCategory, string> = {
      skole: 'bg-blue-50',
      forsikring: 'bg-emerald-50',
      helse: 'bg-red-50',
      økonomi: 'bg-amber-50',
      annet: 'bg-gray-50',
    };
    return map[cat] ?? 'bg-gray-50';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule, DocumentUploadComponent],
  template: `
    <!-- Header -->
    <div class="flex items-center justify-between px-4 pt-4 pb-2">
      @if (activeCategory() !== null) {
        <button (click)="activeCategory.set(null); assignedFilter.set(null)"
                class="flex items-center gap-1.5 text-blue-600 font-medium text-sm active:opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Arkiv
        </button>
        <h2 class="text-base font-bold text-gray-800">{{ categoryLabel(activeCategory()!) }}</h2>
      } @else {
        <h2 class="text-lg font-bold text-gray-800">Arkiv</h2>
      }
      <button (click)="showUpload.set(true)"
              class="flex items-center gap-1.5 text-sm text-blue-600 font-medium active:opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        Legg til
      </button>
    </div>

    <div class="px-4 pb-6 space-y-3">

      @if (activeCategory() === null) {
        <!-- Katalogvisning -->
        @if (docService.loading()) {
          <div class="flex justify-center py-12">
            <div class="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        } @else {
          <div class="space-y-2">
            @for (cat of categories; track cat.key) {
              <button (click)="activeCategory.set(cat.key)"
                      class="w-full flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm active:bg-gray-50 transition-colors text-left">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                     [class]="folderIconBg(cat.key)">
                  @switch (cat.key) {
                    @case ('skole') {
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    }
                    @case ('forsikring') {
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    }
                    @case ('helse') {
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    }
                    @case ('økonomi') {
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    }
                    @default {
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    }
                  }
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-800">{{ cat.label }}</p>
                  <p class="text-sm text-gray-400">
                    {{ categoryCounts()[cat.key] }}
                    {{ categoryCounts()[cat.key] === 1 ? 'dokument' : 'dokumenter' }}
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            }
          </div>
        }

      } @else {
        <!-- Dokumentliste for valgt katalog -->

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

        @if (docService.loading()) {
          <div class="flex justify-center py-12">
            <div class="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        } @else if (filtered().length === 0) {
          <div class="flex flex-col items-center py-14 text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 text-gray-300"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p class="text-sm">Ingen dokumenter her ennå</p>
            <button (click)="showUpload.set(true)"
                    class="mt-3 text-sm text-blue-600 font-medium">
              Legg til dokument
            </button>
          </div>
        } @else {
          <div class="space-y-2">
            @for (doc of filtered(); track doc.id) {
              <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <div class="w-10 h-12 rounded-lg flex items-center justify-center shrink-0"
                     [class]="iconBg(doc.category)">
                  @if (doc.mimeType === 'application/pdf') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h.01M12 15h.01M15 15h.01"/></svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  }
                </div>

                <button class="flex-1 min-w-0 text-left" (click)="openDocument(doc)">
                  <p class="font-semibold text-gray-800 text-sm leading-snug">{{ doc.title }}</p>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span class="text-[11px] text-gray-400">{{ formatDate(doc.uploadedAt) }}</span>
                    <span class="text-[11px] text-gray-400">· {{ doc.uploadedByName }}</span>
                  </div>
                  @if (doc.assignedTo.length) {
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

                @if (canDelete(doc)) {
                  <div class="flex items-center gap-1 shrink-0 mt-0.5">
                    <button (click)="openEdit(doc)"
                            class="text-gray-300 hover:text-blue-400 transition-colors active:scale-90 p-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button (click)="confirmDelete(doc)"
                            class="text-gray-300 hover:text-red-400 transition-colors active:scale-90 p-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- Document viewer overlay -->
    @if (viewingDoc()) {
      <div class="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 px-4 py-3 bg-black/90 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <p class="text-white font-medium text-sm truncate flex-1 min-w-0">{{ viewingDoc()!.title }}</p>
          <button (click)="closeViewer()" class="text-white/80 hover:text-white p-2 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>

        @if (viewingDoc()!.mimeType === 'application/pdf') {
          <iframe [src]="safeUrl(viewingDoc()!.fileUrl)"
                  class="flex-1 w-full max-w-full border-0"
                  title="{{ viewingDoc()!.title }}">
          </iframe>
          <div class="bg-black/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center shrink-0">
            <a [href]="viewingDoc()!.fileUrl" target="_blank" rel="noopener noreferrer"
               class="text-sm text-blue-400 underline">
              Åpne i nettleser
            </a>
          </div>
        } @else {
          <!-- Image viewer -->
          <div class="flex-1 flex items-center justify-center p-4 overflow-hidden">
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

    <!-- Edit sheet -->
    @if (editingDoc()) {
      <div class="fixed inset-0 z-[60] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="editingDoc.set(null)"></div>
        <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-bottom shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto modal-sheet">
          <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1"></div>
          <h3 class="text-lg font-bold text-gray-900">Rediger dokument</h3>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tittel</label>
            <input type="text" [(ngModel)]="editTitle" placeholder="Navn på dokumentet"
                   class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
            <div class="flex flex-wrap gap-2">
              @for (cat of categories; track cat.key) {
                <button (click)="editCategory = cat.key"
                        class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                        [class]="editCategory === cat.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'">
                  {{ cat.label }}
                </button>
              }
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Hvem gjelder dokumentet?</label>
            <div class="flex flex-wrap gap-2">
              @for (opt of assignedOptions(); track getOptKey(opt)) {
                <button (click)="toggleEditAssigned(opt)"
                        class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                        [style.background]="isEditSelected(opt) ? getOptColor(opt) : ''"
                        [class]="isEditSelected(opt) ? 'text-white' : 'bg-gray-100 text-gray-600'">
                  {{ getOptLabel(opt) }}
                </button>
              }
            </div>
          </div>

          <div class="space-y-2 pt-1">
            <button (click)="saveEdit()"
                    [disabled]="!editTitle.trim() || editSaving()"
                    class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
              @if (editSaving()) { Lagrer… } @else { Lagre endringer }
            </button>
            <button (click)="editingDoc.set(null)"
                    class="w-full py-3 rounded-xl font-medium text-sm text-gray-500 active:scale-[0.98] transition-all">
              Avbryt
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
  styles: `
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 1.25rem); }
    @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .modal-sheet { animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
  `,
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
  activeCategory = signal<DocumentCategory | null>(null);
  assignedFilter = signal<AssignedToOption | null>(null);
  editingDoc = signal<ArchiveDocument | null>(null);
  editSaving = signal(false);
  editTitle = '';
  editCategory: DocumentCategory = 'annet';
  editSelected: AssignedToOption[] = [];

  categories = DOCUMENT_CATEGORIES;

  categoryCounts = computed<Record<DocumentCategory, number>>(() => {
    const counts: Record<DocumentCategory, number> = { skole: 0, forsikring: 0, helse: 0, økonomi: 0, annet: 0 };
    for (const doc of this.docService.documents()) {
      counts[doc.category] = (counts[doc.category] ?? 0) + 1;
    }
    return counts;
  });

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
    const catFilter = this.activeCategory();
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

  closeViewer() {
    this.viewingDoc.set(null);
  }

  safeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
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

  openEdit(doc: ArchiveDocument): void {
    this.editTitle = doc.title;
    this.editCategory = doc.category;
    this.editSelected = (doc.assignedTo ?? []).map((tag) =>
      tag.type === 'parent'
        ? ({ type: 'parent', role: tag.role } as AssignedToOption)
        : ({ type: 'child', childId: tag.childId } as AssignedToOption)
    );
    this.editingDoc.set(doc);
  }

  async saveEdit(): Promise<void> {
    const doc = this.editingDoc();
    if (!doc || !this.editTitle.trim()) return;
    this.editSaving.set(true);
    await this.docService.updateDocument(doc.id, {
      title: this.editTitle.trim(),
      category: this.editCategory,
      assignedTo: this.editSelected.map((o) =>
        o.type === 'parent' ? { type: 'parent', role: o.role } : { type: 'child', childId: o.childId }
      ),
    });
    this.editSaving.set(false);
    this.editingDoc.set(null);
  }

  isEditSelected(opt: AssignedToOption): boolean {
    return this.editSelected.some((s) => this.getOptKey(s) === this.getOptKey(opt));
  }

  toggleEditAssigned(opt: AssignedToOption): void {
    const key = this.getOptKey(opt);
    const idx = this.editSelected.findIndex((s) => this.getOptKey(s) === key);
    if (idx >= 0) {
      this.editSelected = this.editSelected.filter((_, i) => i !== idx);
    } else {
      this.editSelected = [...this.editSelected, opt];
    }
  }

  categoryLabel(cat: DocumentCategory): string {
    return DOCUMENT_CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
  }

  categoryColor(cat: DocumentCategory): string {
    return DOCUMENT_CATEGORIES.find((c) => c.key === cat)?.color ?? 'bg-gray-100 text-gray-600';
  }

  folderIconBg(cat: DocumentCategory): string {
    const map: Record<DocumentCategory, string> = {
      skole: 'bg-blue-100',
      forsikring: 'bg-emerald-100',
      helse: 'bg-red-100',
      økonomi: 'bg-amber-100',
      annet: 'bg-gray-100',
    };
    return map[cat] ?? 'bg-gray-100';
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

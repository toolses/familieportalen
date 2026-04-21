import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ListService, AppList, ListItem } from '../../shared/services/list.service';

@Component({
  selector: 'app-list-detail',
  standalone: true,
  imports: [],
  template: `
    @if (list(); as lst) {
      <div class="flex flex-col h-[calc(100dvh-8rem)]">

        <!-- Header -->
        <div class="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-white shrink-0">
          <button (click)="goBack()"
                  class="p-2 rounded-xl hover:bg-gray-100 active:scale-[0.9] transition-all text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-bold text-gray-800 truncate">{{ lst.title }}</h2>
            <p class="text-xs text-gray-400">{{ progressText(lst) }}</p>
          </div>
          @if (lst.type === 'bytte-hus') {
            <div class="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-600"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
          } @else if (lst.type === 'handleliste') {
            <div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
          } @else {
            <div class="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-600"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
          }

          <!-- Nullstill-knapp: kun synlig når noe er avhuket -->
          @if (completedItems().length > 0) {
            <button (click)="isResetModalOpen.set(true)"
                    class="p-2 rounded-xl text-gray-400 hover:text-orange-500 hover:bg-orange-50 active:scale-[0.9] transition-all"
                    title="Nullstill listen">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74"/><path d="M3 3v4h4"/></svg>
            </button>
          }
        </div>

        <!-- Items list -->
        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">

          @if (activeItems().length === 0 && completedItems().length === 0) {
            <div class="flex flex-col items-center py-16 text-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <p class="text-sm font-medium">Listen er tom</p>
              <p class="text-xs mt-1">Legg til punkter nedenfor</p>
            </div>
          }

          <!-- Aktive punkter -->
          @for (item of activeItems(); track item.id) {
            <div class="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm transition-all duration-300"
                 [class.opacity-60]="swipingId() === item.id">
              <button (click)="toggleItem(lst.id, item.id, true)"
                      class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 active:scale-[0.85] transition-all hover:border-blue-400">
              </button>
              <span class="flex-1 text-sm text-gray-800 leading-snug">{{ item.text }}</span>
              <button (click)="deleteItem(lst.id, item.id)"
                      class="p-1.5 text-gray-300 hover:text-red-400 active:scale-[0.85] transition-all rounded-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          }

          <!-- Fullførte punkter -->
          @if (completedItems().length > 0) {
            <div class="pt-2">
              <button (click)="showCompleted.update(v => !v)"
                      class="flex items-center gap-2 text-xs font-semibold text-gray-400 py-1 mb-2 active:opacity-70 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                     [class]="showCompleted() ? 'rotate-90 transition-transform' : 'transition-transform'">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                {{ completedItems().length }} fullført
              </button>

              @if (showCompleted()) {
                <div class="space-y-2">
                  @for (item of completedItems(); track item.id) {
                    <div class="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 transition-all duration-300">
                      <button (click)="toggleItem(lst.id, item.id, false)"
                              class="w-6 h-6 rounded-full bg-blue-500 border-2 border-blue-500 flex items-center justify-center shrink-0 active:scale-[0.85] transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <span class="flex-1 text-sm text-gray-400 line-through leading-snug">{{ item.text }}</span>
                      <button (click)="deleteItem(lst.id, item.id)"
                              class="p-1.5 text-gray-200 hover:text-red-400 active:scale-[0.85] transition-all rounded-lg shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  }
                  @if (completedItems().length > 1) {
                    <button (click)="clearCompleted(lst.id)"
                            class="w-full py-2 text-xs text-gray-400 underline text-center active:opacity-60 transition-opacity">
                      Fjern alle fullførte
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Add item input -->
        <div class="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
          <div class="flex gap-2">
            <input
              type="text"
              placeholder="Legg til nytt punkt..."
              [value]="newItemText()"
              (input)="newItemText.set($any($event.target).value)"
              (keydown.enter)="addItem(lst.id)"
              class="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
            />
            <button (click)="addItem(lst.id)"
                    [disabled]="!newItemText().trim()"
                    class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-[0.93] transition-all shadow-sm shadow-blue-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center py-24 px-6 text-center">
        @if (loading()) {
          <p class="text-gray-400 text-sm">Laster...</p>
        } @else {
          <p class="text-gray-500 font-medium mb-2">Listen ble ikke funnet</p>
          <button (click)="goBack()" class="text-blue-600 text-sm underline">Tilbake til lister</button>
        }
      </div>
    }

    <!-- Bekreftelsesmodal for nullstilling -->
    @if (isResetModalOpen()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
           (click)="isResetModalOpen.set(false)">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
             (click)="$event.stopPropagation()">
          <div class="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74"/><path d="M3 3v4h4"/></svg>
          </div>
          <h3 class="text-lg font-bold text-gray-800 text-center mb-2">Nullstille listen?</h3>
          <p class="text-sm text-gray-500 text-center mb-6 leading-relaxed">
            Dette vil fjerne avhukingen på alle elementene slik at listen er klar til neste gang. Er du sikker?
          </p>
          <div class="flex gap-3">
            <button (click)="isResetModalOpen.set(false)"
                    class="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 active:scale-[0.97] transition-transform">
              Avbryt
            </button>
            <button (click)="confirmReset()"
                    class="flex-1 py-3 bg-orange-500 rounded-2xl text-sm font-semibold text-white shadow-sm shadow-orange-200 active:scale-[0.97] transition-transform">
              Nullstill
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ListDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listService = inject(ListService);

  readonly loading = signal(true);
  readonly newItemText = signal('');
  readonly showCompleted = signal(true);
  readonly swipingId = signal<string | null>(null);
  readonly isResetModalOpen = signal(false);

  readonly list = computed<AppList | null>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return null;
    const lists = this.listService.lists();
    // Support both doc-ID lookup and type-based lookup for singleton routes
    return lists.find((l) => l.id === id || l.type === id) ?? null;
  });

  readonly activeItems = computed<ListItem[]>(() => {
    return this.list()?.items.filter((i) => !i.completed) ?? [];
  });

  readonly completedItems = computed<ListItem[]>(() => {
    return this.list()?.items.filter((i) => i.completed) ?? [];
  });

  constructor() {
    // Once lists load, mark loading done
    effect(() => {
      if (this.listService.lists().length >= 0) {
        this.loading.set(false);
      }
    });
  }

  progressText(lst: AppList): string {
    const total = lst.items.length;
    if (total === 0) return 'Tom liste';
    const done = lst.items.filter((i) => i.completed).length;
    if (done === total) return 'Alt fullført! 🎉';
    return `${done} av ${total} fullført`;
  }

  async toggleItem(listId: string, itemId: string, completed: boolean): Promise<void> {
    await this.listService.toggleItem(listId, itemId, completed);
  }

  async addItem(listId: string): Promise<void> {
    const text = this.newItemText().trim();
    if (!text) return;
    this.newItemText.set('');
    await this.listService.addItem(listId, text);
  }

  async deleteItem(listId: string, itemId: string): Promise<void> {
    await this.listService.deleteItem(listId, itemId);
  }

  async clearCompleted(listId: string): Promise<void> {
    const lst = this.list();
    if (!lst) return;
    for (const item of lst.items.filter((i) => i.completed)) {
      await this.listService.deleteItem(listId, item.id);
    }
  }

  async confirmReset(): Promise<void> {
    const lst = this.list();
    if (!lst) return;
    this.isResetModalOpen.set(false);
    await this.listService.resetList(lst.id);
  }

  goBack(): void {
    this.router.navigate(['/lister']);
  }
}

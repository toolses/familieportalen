import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ListService, AppList } from '../../shared/services/list.service';

@Component({
  selector: 'app-lister',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="px-4 pt-4 pb-6 space-y-6">

      <h2 class="text-lg font-bold text-gray-800">Lister</h2>

      <!-- Faste lister -->
      <section>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Faste lister</h3>
        <div class="space-y-2">
          @for (list of fixedLists(); track list.id) {
            <a [routerLink]="['/lister', list.type]"
               class="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   [class]="list.type === 'bytte-hus' ? 'bg-purple-100' : 'bg-green-100'">
                @if (list.type === 'bytte-hus') {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-600"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                }
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-800">{{ list.title }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ progressText(list) }}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          }
          @if (fixedLists().length === 0) {
            <div class="text-center py-6 text-gray-400 text-sm">Laster...</div>
          }
        </div>
      </section>

      <!-- Pakkelister -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Våre Lister</h3>
          <button (click)="openNewDialog()"
                  class="text-sm font-medium text-blue-600 flex items-center gap-1 active:scale-[0.95] transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ny liste
          </button>
        </div>

        @if (pakkelister().length === 0) {
          <div class="flex flex-col items-center py-8 text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <p class="text-sm">Ingen lister ennå</p>
            <p class="text-xs mt-1">Trykk "+ Ny liste" for å komme i gang</p>
          </div>
        } @else {
          <div class="space-y-2">
            @for (list of pakkelister(); track list.id) {
              <div class="flex items-center bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <a [routerLink]="['/lister', list.id]"
                   class="flex items-center gap-3 flex-1 p-4 active:bg-gray-50 transition-colors min-w-0">
                  <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-600"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-800 truncate">{{ list.title }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ progressText(list) }}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
                <button (click)="confirmDelete(list)"
                        class="px-4 self-stretch flex items-center text-gray-300 hover:text-red-400 active:text-red-500 transition-colors border-l border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            }
          </div>
        }
      </section>
    </div>

    <!-- Ny liste dialog -->
    @if (showDialog()) {
      <div class="fixed inset-0 bg-black/40 z-55 flex items-end justify-center"
           (click)="closeDialog()">
        <div class="bg-white rounded-t-3xl w-full max-w-lg px-6 pt-6 pb-10 shadow-2xl"
             (click)="$event.stopPropagation()">
          <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <h3 class="text-lg font-bold text-gray-800 mb-4">Ny liste</h3>
          <input
            type="text"
            placeholder="Navn på listen..."
            [value]="newTitle()"
            (input)="newTitle.set($any($event.target).value)"
            (keydown.enter)="createPakkeliste()"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
            autofocus
          />
          <div class="flex gap-3">
            <button (click)="closeDialog()"
                    class="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 active:scale-[0.98] transition-transform">
              Avbryt
            </button>
            <button (click)="createPakkeliste()"
                    [disabled]="!newTitle().trim()"
                    class="flex-1 py-3 bg-blue-600 rounded-xl text-sm font-medium text-white disabled:opacity-40 active:scale-[0.98] transition-transform">
              Opprett
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ListerComponent {
  private listService = inject(ListService);
  private router = inject(Router);

  readonly showDialog = signal(false);
  readonly newTitle = signal('');

  readonly fixedLists = computed(() =>
    this.listService
      .lists()
      .filter((l) => l.type === 'bytte-hus' || l.type === 'handleliste')
      .sort((a, b) => {
        const order: Record<string, number> = { 'bytte-hus': 0, handleliste: 1 };
        return (order[a.type] ?? 9) - (order[b.type] ?? 9);
      })
  );

  readonly pakkelister = computed(() =>
    this.listService.lists().filter((l) => l.type === 'pakkeliste')
  );

  progressText(list: AppList): string {
    const total = list.items.length;
    if (total === 0) return 'Tom liste';
    const done = list.items.filter((i) => i.completed).length;
    return `${done} av ${total} fullført`;
  }

  openNewDialog(): void {
    this.newTitle.set('');
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  async createPakkeliste(): Promise<void> {
    const title = this.newTitle().trim();
    if (!title) return;
    const id = await this.listService.createPakkeliste(title);
    this.closeDialog();
    this.router.navigate(['/lister', id]);
  }

  async confirmDelete(list: AppList): Promise<void> {
    if (confirm(`Slett "${list.title}"? Dette kan ikke angres.`)) {
      await this.listService.deleteList(list.id);
    }
  }
}

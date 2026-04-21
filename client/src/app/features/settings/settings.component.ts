import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { GoogleCalendarService } from '../../shared/services/google-calendar.service';
import { ResidencyPlannerComponent } from './residency-planner.component';
import { Child } from '../school-plan/models/school-plan.models';

const PRESET_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];

type ConfirmMode = 'delete-child' | 'clear-all';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, ResidencyPlannerComponent],
  template: `
    <div class="px-4 pt-4 pb-8 space-y-6">
      <h2 class="text-xl font-bold text-gray-800">Innstillinger</h2>

      <!-- Google Calendar -->
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Google Kalender</h3>

        @if (google.isConnected()) {
          <div class="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Familiekalender tilkoblet – delt med alle
          </div>

          @if (google.calendars().length > 0) {
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">Velg familiekalender</label>
              <select [ngModel]="google.selectedCalendarId()"
                      (ngModelChange)="google.selectCalendar($event)"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
                @for (cal of google.calendars(); track cal.id) {
                  <option [value]="cal.id">{{ cal.summary }}</option>
                }
              </select>
            </div>
          } @else {
            <button (click)="loadCalendars()"
                    class="text-sm text-blue-600 font-medium">
              Last inn kalenderliste
            </button>
          }

          <button (click)="disconnectCalendar()"
                  class="text-sm text-red-500 font-medium">
            Koble fra kalender
          </button>
        } @else {
          <p class="text-sm text-gray-500">Koble til én gang – alle familiemedlemmer ser hendelsene automatisk.</p>
          <button (click)="connectCalendar()"
                  class="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:scale-[0.98] transition-all hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Koble til Google Kalender
          </button>
          @if (googleConnectError()) {
            <p class="text-xs text-red-500">{{ googleConnectError() }}</p>
          }
        }
      </div>

      <!-- Samvaersplan -->
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Samværsplan</h3>
          <p class="text-xs text-gray-400 mt-0.5">Sett opp fast rotasjon og overstyr enkeltdager.</p>
        </div>
        <app-residency-planner />

        @if (!data.baseRotation()) {
          <div class="border-t pt-4 space-y-2">
            <p class="text-xs text-gray-500 font-medium">Manuelt valg (brukes uten fast rotasjon)</p>
            <div class="flex gap-2">
              <button (click)="setHousehold('Mamma')"
                      class="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98]"
                      [class]="data.householdLabel() === 'Mamma'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600'">
                Hos Mamma
              </button>
              <button (click)="setHousehold('Pappa')"
                      class="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98]"
                      [class]="data.householdLabel() === 'Pappa'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600'">
                Hos Pappa
              </button>
            </div>
            @if (data.householdLabel()) {
              <button (click)="setHousehold(null)" class="text-xs text-gray-400 underline">Fjern valg</button>
            }
          </div>
        }
      </div>

      <!-- Barn-administrasjon -->
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Barn</h3>
          <button (click)="openAdd()"
                  class="flex items-center gap-1 text-sm text-blue-600 font-medium active:scale-[0.97] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Legg til
          </button>
        </div>

        @if (data.children().length === 0) {
          <p class="text-sm text-gray-400 text-center py-2">Ingen barn lagt til ennå.</p>
        } @else {
          <div class="space-y-2">
            @for (child of data.children(); track child.id) {
              <button (click)="openEdit(child)"
                      class="w-full flex items-center gap-3 bg-gray-50 rounded-xl p-3 active:bg-gray-100 transition-colors text-left">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                     [style.background]="child.color">
                  {{ child.name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <span class="font-medium text-gray-800 text-sm">{{ child.name }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ child.grade }}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            }
          </div>
        }
      </div>

      <!-- Data management -->
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Data</h3>
        <p class="text-sm text-gray-500">
          {{ data.children().length }} barn registrert.
        </p>
        <button (click)="openConfirm('clear-all')"
                class="text-sm text-red-600 font-medium">
          Slett all data
        </button>
      </div>

      @if (saved()) {
        <div class="p-3 bg-green-100 text-green-800 rounded-xl text-sm text-center font-medium">
          Lagret!
        </div>
      }
    </div>

    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="closeModal()"></div>
        <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-bottom shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto modal-sheet">
          <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1"></div>
          <h3 class="text-lg font-bold text-gray-900">
            {{ editingChild() ? 'Endre barn' : 'Legg til barn' }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Navn</label>
              <input [(ngModel)]="modalName" placeholder="Navn"
                     class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Trinn</label>
              <input [(ngModel)]="modalGrade" placeholder="f.eks. 3. trinn"
                     class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-2">Farge</label>
              <div class="flex gap-2.5 flex-wrap">
                @for (color of presetColors; track color) {
                  <button (click)="modalColor = color"
                          class="w-9 h-9 rounded-full transition-all active:scale-[0.95]"
                          [style.background]="color"
                          [class]="modalColor === color ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''">
                  </button>
                }
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                 [style.background]="modalColor">
              {{ (modalName.trim().charAt(0) || '?').toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800">{{ modalName.trim() || 'Navn' }}</p>
              <p class="text-xs text-gray-400">{{ modalGrade.trim() || 'Trinn' }}</p>
            </div>
          </div>
          <div class="space-y-2 pt-1">
            <button (click)="saveModal()"
                    [disabled]="!modalName.trim()"
                    class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
              {{ editingChild() ? 'Lagre endringer' : 'Legg til' }}
            </button>
            @if (editingChild()) {
              <button (click)="openConfirm('delete-child')"
                      class="w-full py-3 rounded-xl font-medium text-sm text-red-600 bg-red-50 active:scale-[0.98] transition-all">
                Fjern {{ editingChild()!.name }}
              </button>
            }
            <button (click)="closeModal()"
                    class="w-full py-3 rounded-xl font-medium text-sm text-gray-500 active:scale-[0.98] transition-all">
              Avbryt
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Confirmation sheet -->
    @if (confirmMode()) {
      <div class="fixed inset-0 z-[60] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="closeConfirm()"></div>
        <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-bottom shadow-2xl space-y-4 modal-sheet">
          <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1"></div>

          @if (confirmMode() === 'delete-child') {
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                   [style.background]="editingChild()!.color">
                {{ editingChild()!.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">Fjern {{ editingChild()!.name }}?</h3>
                <p class="text-xs text-gray-400 mt-0.5">Alle ukeplaner for dette barnet slettes.</p>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">
                Skriv inn <span class="font-bold text-gray-700">{{ editingChild()!.name }}</span> for å bekrefte
              </label>
              <input [(ngModel)]="confirmInput"
                     [placeholder]="editingChild()!.name"
                     autocomplete="off"
                     class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div class="space-y-2">
              <button (click)="executeConfirm()"
                      [disabled]="confirmInput.trim().toLowerCase() !== editingChild()!.name.toLowerCase()"
                      class="w-full bg-red-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-35 active:scale-[0.98] transition-all">
                Fjern {{ editingChild()!.name }} permanent
              </button>
              <button (click)="closeConfirm()"
                      class="w-full py-3 rounded-xl font-medium text-sm text-gray-500 active:scale-[0.98] transition-all">
                Avbryt
              </button>
            </div>
          }

          @if (confirmMode() === 'clear-all') {
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">Slett all data?</h3>
                <p class="text-xs text-gray-400 mt-0.5">Alle barn, ukeplaner og innstillinger fjernes.</p>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">
                Skriv <span class="font-bold text-gray-700">SLETT</span> for å bekrefte
              </label>
              <input [(ngModel)]="confirmInput"
                     placeholder="SLETT"
                     autocomplete="off"
                     class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div class="space-y-2">
              <button (click)="executeConfirm()"
                      [disabled]="confirmInput.trim() !== 'SLETT'"
                      class="w-full bg-red-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-35 active:scale-[0.98] transition-all">
                Slett all data permanent
              </button>
              <button (click)="closeConfirm()"
                      class="w-full py-3 rounded-xl font-medium text-sm text-gray-500 active:scale-[0.98] transition-all">
                Avbryt
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 1.25rem); }

    @keyframes slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .modal-sheet { animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
  `,
})
export class SettingsComponent {
  data = inject(SchoolDataService);
  google = inject(GoogleCalendarService);

  presetColors = PRESET_COLORS;
  saved = signal(false);
  googleConnectError = signal<string | null>(null);

  modalOpen = signal(false);
  editingChild = signal<Child | null>(null);
  modalName = '';
  modalGrade = '';
  modalColor = PRESET_COLORS[0];

  confirmMode = signal<ConfirmMode | null>(null);
  confirmInput = '';

  openAdd() {
    this.editingChild.set(null);
    this.modalName = '';
    this.modalGrade = '';
    this.modalColor = PRESET_COLORS[0];
    this.modalOpen.set(true);
  }

  openEdit(child: Child) {
    this.editingChild.set(child);
    this.modalName = child.name;
    this.modalGrade = child.grade;
    this.modalColor = child.color;
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  saveModal() {
    const name = this.modalName.trim();
    if (!name) return;
    const grade = this.modalGrade.trim() || 'Ukjent trinn';
    const child = this.editingChild();
    if (child) {
      this.data.updateChild(child.id, name, grade, this.modalColor);
    } else {
      this.data.addChild(name, grade, this.modalColor);
    }
    this.closeModal();
    this.flashSaved();
  }

  deleteChild() {
    const child = this.editingChild();
    if (!child) return;
    this.data.removeChild(child.id);
    this.closeConfirm();
    this.closeModal();
  }

  openConfirm(mode: ConfirmMode) {
    this.confirmInput = '';
    this.confirmMode.set(mode);
  }

  closeConfirm() {
    this.confirmMode.set(null);
    this.confirmInput = '';
  }

  async executeConfirm() {
    const mode = this.confirmMode();
    if (mode === 'delete-child') {
      this.deleteChild();
    } else if (mode === 'clear-all') {
      if (this.confirmInput.trim() !== 'SLETT') return;
      await this.data.clearAllData();
      this.google.disconnect();
      location.reload();
    }
  }

  setHousehold(label: 'Mamma' | 'Pappa' | null) {
    this.data.setHouseholdLabel(label);
    this.flashSaved();
  }

  async loadCalendars() {
    await this.google.fetchCalendars();
  }

  async connectCalendar() {
    this.googleConnectError.set(null);
    try {
      await this.google.startConnectFlow();
    } catch {
      this.googleConnectError.set('Kunne ikke starte tilkobling. Prøv igjen.');
    }
  }

  disconnectCalendar() {
    this.google.disconnect();
  }

  async clearAllData() {
    this.openConfirm('clear-all');
  }

  private flashSaved() {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
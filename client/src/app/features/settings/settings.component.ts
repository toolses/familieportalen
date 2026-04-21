import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { GoogleCalendarService } from '../../shared/services/google-calendar.service';
import { ResidencyPlannerComponent } from './residency-planner.component';

const PRESET_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];

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

        @if (google.calendars().length > 0) {
          <div class="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Kalender tilkoblet via Google-innlogging
          </div>

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
          <p class="text-sm text-gray-500">Kalenderdata lastes automatisk via din Google-innlogging.</p>
          <button (click)="loadCalendars()"
                  class="text-sm text-blue-600 font-medium">
            Last inn kalendere
          </button>
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
        <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Barn</h3>

        @if (data.children().length === 0) {
          <p class="text-sm text-gray-400 text-center py-2">Ingen barn lagt til ennå.</p>
        } @else {
          <div class="space-y-2">
            @for (child of data.children(); track child.id) {
              <div class="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                     [style.background]="child.color">
                  {{ child.name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <span class="font-medium text-gray-800 text-sm">{{ child.name }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ child.grade }}</span>
                </div>
                <button (click)="removeChild(child.id)"
                        class="text-red-400 hover:text-red-600 p-1 active:scale-[0.98]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- Add child form -->
        <div class="border-t pt-4 space-y-3">
          <p class="text-sm font-medium text-gray-700">Legg til barn</p>
          <div class="space-y-2">
            <input [(ngModel)]="newChildName" placeholder="Navn"
                   class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input [(ngModel)]="newChildGrade" placeholder="Trinn (f.eks. 3. trinn)"
                   class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <div>
              <label class="block text-xs text-gray-500 mb-1.5">Farge</label>
              <div class="flex gap-2 flex-wrap">
                @for (color of presetColors; track color) {
                  <button (click)="newChildColor = color"
                          class="w-8 h-8 rounded-full transition-all active:scale-[0.98]"
                          [style.background]="color"
                          [class]="newChildColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''">
                  </button>
                }
              </div>
            </div>
          </div>
          <button (click)="addChild()"
                  [disabled]="!newChildName.trim()"
                  class="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-40 active:scale-[0.98] transition-all">
            Legg til
          </button>
        </div>
      </div>

      <!-- Data management -->
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Data</h3>
        <p class="text-sm text-gray-500">
          {{ data.children().length }} barn registrert.
        </p>
        <button (click)="clearAllData()"
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
  `,
})
export class SettingsComponent {
  data = inject(SchoolDataService);
  google = inject(GoogleCalendarService);

  newChildName = '';
  newChildGrade = '';
  newChildColor = PRESET_COLORS[0];
  presetColors = PRESET_COLORS;
  saved = signal(false);

  constructor() {
    this.google.initAfterLogin();
  }

  setHousehold(label: 'Mamma' | 'Pappa' | null) {
    this.data.setHouseholdLabel(label);
    this.flashSaved();
  }

  addChild() {
    const name = this.newChildName.trim();
    if (!name) return;
    this.data.addChild(name, this.newChildGrade.trim() || 'Ukjent trinn', this.newChildColor);
    this.newChildName = '';
    this.newChildGrade = '';
    const idx = PRESET_COLORS.indexOf(this.newChildColor);
    this.newChildColor = PRESET_COLORS[(idx + 1) % PRESET_COLORS.length];
    this.flashSaved();
  }

  removeChild(id: string) {
    if (confirm('Fjerne dette barnet og alle tilhørende data?')) {
      this.data.removeChild(id);
    }
  }

  async loadCalendars() {
    await this.google.fetchCalendars();
  }

  async clearAllData() {
    if (confirm('Er du sikker? Alle lagrede data slettes.')) {
      await this.data.clearAllData();
      this.google.disconnect();
      location.reload();
    }
  }

  private flashSaved() {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}

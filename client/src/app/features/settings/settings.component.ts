import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolDataService } from '../../shared/services/school-data.service';
import { GoogleCalendarService } from '../../shared/services/google-calendar.service';
import { ResidencyPlannerComponent } from './residency-planner.component';
import { Child } from '../school-plan/models/school-plan.models';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../../shared/services/auth.service';
import { HouseholdService } from '../../shared/services/household.service';

const PRESET_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];

type ConfirmMode = 'delete-child' | 'clear-all';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, ResidencyPlannerComponent],
  template: `
    <div class="px-4 pt-4 pb-8 space-y-6">
      <h2 class="text-xl font-bold text-gray-800">Innstillinger</h2>

      <!-- Google Calendar (kun admin) -->
      @if (auth.isAdmin()) {
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3 border border-indigo-100">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Google Kalender</h3>
          <span class="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">Admin</span>
        </div>

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
      }

      <!-- Husstand -->
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Husstand</h3>

        @if (household.ready()) {
          <!-- Invitasjonskode -->
          <div class="space-y-1">
            <p class="text-xs text-gray-500">Del denne koden med familiemedlemmer</p>
            <button (click)="copyInviteCode()"
                    class="flex items-center gap-3 w-full bg-gray-50 rounded-xl px-4 py-3 active:bg-gray-100 transition-colors">
              <span class="flex-1 font-mono text-2xl font-bold tracking-widest text-gray-800">
                {{ household.inviteCode() }}
              </span>
              <span class="text-xs font-semibold shrink-0 transition-colors"
                    [class]="codeCopied() ? 'text-green-600' : 'text-blue-600'">
                {{ codeCopied() ? '✓ Kopiert' : 'Kopier' }}
              </span>
            </button>
          </div>

          <!-- Medlemsliste -->
          <div class="space-y-3">
            @for (member of household.members(); track member.uid) {
              <div class="space-y-1.5">
                <div class="flex items-center gap-3">
                  @if (member.photoURL) {
                    <img [src]="member.photoURL" class="w-8 h-8 rounded-full shrink-0" referrerpolicy="no-referrer" />
                  } @else {
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                      {{ member.displayName.charAt(0).toUpperCase() }}
                    </div>
                  }
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 truncate">{{ member.displayName }}</p>
                    <p class="text-xs text-gray-400">{{ member.role === 'admin' ? 'Admin' : 'Medlem' }}</p>
                  </div>
                  @if (household.isAdmin() && member.uid !== auth.user()?.uid) {
                    @if (member.role === 'member') {
                      <button (click)="promoteHouseholdMember(member.uid)"
                              class="text-xs text-indigo-600 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors shrink-0">
                        Gjør admin
                      </button>
                    }
                    <button (click)="removeHouseholdMember(member.uid)"
                            class="text-xs text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                      Fjern
                    </button>
                  }
                </div>
                <!-- Mamma / Pappa rolle-valg (kun admin) -->
                @if (household.isAdmin()) {
                  <div class="flex gap-1.5 ml-11">
                    <button (click)="setParentRole(member.uid, 'Mamma')"
                            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
                            [class]="member.parentRole === 'Mamma'
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-600'">
                      Mamma
                    </button>
                    <button (click)="setParentRole(member.uid, 'Pappa')"
                            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
                            [class]="member.parentRole === 'Pappa'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'">
                      Pappa
                    </button>
                    @if (member.parentRole) {
                      <button (click)="setParentRole(member.uid, null)"
                              class="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-600 transition-all active:scale-[0.97]">
                        ✕
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <button (click)="showJoinSheet.set(true)"
                  class="text-sm text-blue-600 font-medium">
            Bli med i en annen husstand
          </button>
        } @else {
          <p class="text-sm text-gray-400 animate-pulse">Laster husstand…</p>
        }
      </div>

      <!-- Push-varsler -->
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Push-varsler</h3>

        @if (!notifications.isSupported()) {
          <p class="text-sm text-gray-400">Push-varsler støttes ikke av denne nettleseren.</p>
        } @else if (!notifications.isStandalone()) {
          <!-- iOS: må installeres som PWA for å få push-varsler -->
          <div class="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <div class="space-y-1">
              <p class="text-sm font-medium text-amber-800">Installer appen først</p>
              <p class="text-xs text-amber-700">For å aktivere push-varsler på iOS må du legge til appen på hjemskjermen. Trykk på <strong>Del</strong>-ikonet i Safari og velg <strong>«Legg til på hjemskjerm»</strong>.</p>
            </div>
          </div>
        } @else if (notifications.permissionState() === 'granted') {
          <div class="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Push-varsler er aktivert på denne enheten
          </div>
        } @else if (notifications.permissionState() === 'denied') {
          <div class="flex gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
            <p class="text-sm text-red-700">Varsler er blokkert. Gå til nettleserinnstillingene for å tillate varsler fra denne siden.</p>
          </div>
        } @else {
          <p class="text-sm text-gray-500">Få beskjed om byttedager og viktige hendelser direkte på telefonen.</p>
          <button (click)="enablePushNotifications()"
                  [disabled]="pushLoading()"
                  class="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:scale-[0.98] transition-all hover:bg-gray-50 disabled:opacity-40">
            @if (pushLoading()) {
              <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Aktiverer...
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Aktiver Push-varsler
            }
          </button>
        }
      </div>

      <!-- Admin: Push-varsler test -->
      @if (auth.isAdmin()) {
        <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3 border border-indigo-100">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Admin – Test varsler</h3>
            <span class="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <p class="text-sm text-gray-500">Send et test-varsel til alle dine registrerte enheter.</p>
          @if (testPushResult()) {
            <div class="text-sm rounded-xl px-3 py-2"
                 [class]="testPushResult()!.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'">
              {{ testPushResult()!.message }}
            </div>
          }
          <button (click)="sendTestPush()"
                  [disabled]="testPushLoading()"
                  class="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-40">
            @if (testPushLoading()) {
              <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Sender...
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Send test-varsel
            }
          </button>
        </div>
      }

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

      <!-- Barn-administrasjon (kun admin) -->
      @if (auth.isAdmin()) {
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-4 border border-indigo-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Barn</h3>
            <span class="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">Admin</span>
          </div>
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

      }

      <!-- Data management (kun admin) -->
      @if (auth.isAdmin()) {
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3 border border-indigo-100">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Data</h3>
          <span class="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <p class="text-sm text-gray-500">
          {{ data.children().length }} barn registrert.
        </p>
        <button (click)="openConfirm('clear-all')"
                class="text-sm text-red-600 font-medium">
          Slett all data
        </button>
      </div>
      }

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

    <!-- Bli med i husstand-sheet -->
    @if (showJoinSheet()) {
      <div class="fixed inset-0 z-[70] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="showJoinSheet.set(false)"></div>
        <div class="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-bottom shadow-2xl space-y-5 modal-sheet">
          <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1"></div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">Bli med i husstand</h3>
            <p class="text-sm text-gray-500 mt-1">Skriv inn invitasjonskoden fra et familiemedlem.</p>
          </div>
          <input [(ngModel)]="joinCode"
                 placeholder="ABC123"
                 autocomplete="off"
                 (input)="joinError.set(null)"
                 class="w-full border border-gray-200 rounded-xl px-3 py-3 text-lg font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
          @if (joinError()) {
            <p class="text-sm text-red-600">{{ joinError() }}</p>
          }
          <div class="space-y-2">
            <button (click)="joinHousehold()"
                    [disabled]="!joinCode.trim() || joinLoading()"
                    class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              @if (joinLoading()) {
                <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Kobler til…
              } @else {
                Bli med
              }
            </button>
            <button (click)="showJoinSheet.set(false)"
                    class="w-full py-3 rounded-xl font-medium text-sm text-gray-500 active:scale-[0.98] transition-all">
              Avbryt
            </button>
          </div>
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
  notifications = inject(NotificationService);
  auth = inject(AuthService);
  household = inject(HouseholdService);

  // Husstand
  codeCopied = signal(false);
  showJoinSheet = signal(false);
  joinCode = '';
  joinLoading = signal(false);
  joinError = signal<string | null>(null);

  copyInviteCode(): void {
    const code = this.household.inviteCode();
    if (!code) return;
    navigator.clipboard.writeText(code).catch(() => {});
    this.codeCopied.set(true);
    setTimeout(() => this.codeCopied.set(false), 2000);
  }

  async joinHousehold(): Promise<void> {
    this.joinLoading.set(true);
    this.joinError.set(null);
    try {
      await this.household.joinHousehold(this.joinCode);
      this.showJoinSheet.set(false);
      this.joinCode = '';
    } catch (err: unknown) {
      this.joinError.set(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.');
    } finally {
      this.joinLoading.set(false);
    }
  }

  async removeHouseholdMember(uid: string): Promise<void> {
    await this.household.removeMember(uid);
  }

  async promoteHouseholdMember(uid: string): Promise<void> {
    await this.household.promoteMember(uid);
  }

  async setParentRole(uid: string, role: 'Mamma' | 'Pappa' | null): Promise<void> {
    await this.household.setMemberParentRole(uid, role);
    this.flashSaved();
  }

  presetColors = PRESET_COLORS;
  saved = signal(false);
  googleConnectError = signal<string | null>(null);
  pushLoading = signal(false);
  testPushLoading = signal(false);
  testPushResult = signal<{ ok: boolean; message: string } | null>(null);

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

  async enablePushNotifications() {
    this.pushLoading.set(true);
    try {
      await this.notifications.requestPermission();
    } finally {
      this.pushLoading.set(false);
    }
  }

  async sendTestPush() {
    this.testPushLoading.set(true);
    this.testPushResult.set(null);
    try {
      const res = await this.notifications.sendTestNotification();
      const sent = res.sent ?? 0;
      const msg = res.message ?? `Sendt til ${sent} enhet${sent !== 1 ? 'er' : ''}.`;
      this.testPushResult.set({ ok: true, message: msg });
    } catch {
      this.testPushResult.set({ ok: false, message: 'Feil: Kunne ikke sende test-varsel.' });
    } finally {
      this.testPushLoading.set(false);
    }
  }

  async clearAllData() {
    this.openConfirm('clear-all');
  }

  private flashSaved() {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
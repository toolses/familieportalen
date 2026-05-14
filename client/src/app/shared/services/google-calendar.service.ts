import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { SchoolDataService, SelectedCalendar } from './school-data.service';
import { firebaseDb as db } from '../../core/firebase';

export type { SelectedCalendar } from './school-data.service';

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  description: string;
  primary: boolean;
  backgroundColor: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  spanStart: string | null;
  spanEnd: string | null;
  spanStartTime: string | null;
  spanEndTime: string | null;
  location: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private data = inject(SchoolDataService);

  // ── Delt familiekalender ────────────────────────────────────────────────
  readonly calendars = signal<GoogleCalendarInfo[]>([]);
  readonly events = signal<GoogleCalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly connected = signal(false);

  readonly isConnected = computed(() => this.connected());
  readonly selectedCalendars = computed(() => this.data.sharedCalendars());

  // Kept for backward compat with calendar component
  readonly selectedCalendarId = computed(() => this.selectedCalendars()[0]?.id ?? null);
  readonly personalSelectedCalendarId = computed(() => this.personalSelectedCalendars()[0]?.id ?? null);

  readonly needsReconnect = computed(() => false);

  // ── Personlig kalender ──────────────────────────────────────────────────
  readonly personalConnected = signal(false);
  readonly personalCalendars = signal<GoogleCalendarInfo[]>([]);
  readonly personalSelectedCalendars = signal<SelectedCalendar[]>([]);
  readonly personalEvents = signal<GoogleCalendarEvent[]>([]);
  readonly personalLoading = signal(false);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn() && !this.auth.loading() && this.data.sharedConfigLoaded()) {
        this.checkStatus();
        this.checkPersonalStatus();
      }
    });
  }

  async initAfterLogin(): Promise<void> {
    await this.checkStatus();
  }

  // ── Delt kalender-metoder ───────────────────────────────────────────────

  async checkStatus(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ connected: boolean }>('/api/auth/google/status')
      );
      this.connected.set(res.connected);
      if (res.connected) {
        const calendars = this.data.sharedCalendars();
        if (calendars.length > 0) {
          await this.fetchAllSharedEvents();
        } else {
          await this.fetchCalendars();
        }
      }
    } catch {
      this.connected.set(false);
    }
  }

  async startConnectFlow(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ url: string }>('/api/auth/google/url')
    );
    window.location.href = res.url;
  }

  async handleCallback(code: string): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/auth/google/callback', { code })
    );
    this.connected.set(true);
  }

  async fetchCalendars(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ calendars: GoogleCalendarInfo[] }>('/api/calendar/list')
      );
      this.calendars.set(res.calendars ?? []);
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
      this.calendars.set([]);
    }
  }

  async setSharedCalendars(calendars: SelectedCalendar[]): Promise<void> {
    this.data.setSharedCalendars(calendars);
    await this.fetchAllSharedEvents();
  }

  async fetchAllSharedEvents(startDate?: Date, endDate?: Date): Promise<void> {
    const calendars = this.selectedCalendars();
    if (!calendars.length) { this.events.set([]); return; }
    if (!startDate || !endDate) ({ startDate, endDate } = this.currentWeekRange());

    this.loading.set(true);
    try {
      const results = await Promise.all(
        calendars.map((cal) =>
          firstValueFrom(
            this.http.get<any[]>(`/api/calendar/events/${encodeURIComponent(cal.id)}`, {
              params: { timeMin: startDate!.toISOString(), timeMax: endDate!.toISOString() },
            })
          )
            .then((items) => (items ?? []).flatMap((item) => this.expandEvent(item, cal.color)))
            .catch(() => [] as GoogleCalendarEvent[])
        )
      );
      this.events.set(results.flat());
    } finally {
      this.loading.set(false);
    }
  }

  async fetchEventsForRange(calendarId: string, startDate?: Date, endDate?: Date): Promise<void> {
    await this.fetchAllSharedEvents(startDate, endDate);
  }

  async disconnect(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/google/disconnect', {}));
    } catch { /* ignore */ }
    this.calendars.set([]);
    this.events.set([]);
    this.connected.set(false);
    this.data.setSharedCalendars([]);
  }

  async reconnectCalendar(): Promise<void> {}

  // ── Personlig kalender-metoder ──────────────────────────────────────────

  async checkPersonalStatus(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ connected: boolean }>('/api/auth/google/personal/status')
      );
      this.personalConnected.set(res.connected);
      if (res.connected) {
        const calendars = await this.loadPersonalSelectedCalendars();
        if (calendars.length > 0) {
          this.personalSelectedCalendars.set(calendars);
          await this.fetchAllPersonalEvents();
        } else {
          await this.fetchPersonalCalendars();
        }
      }
    } catch {
      this.personalConnected.set(false);
    }
  }

  async startPersonalConnectFlow(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ url: string }>('/api/auth/google/personal/url')
    );
    window.location.href = res.url;
  }

  async handlePersonalCallback(code: string): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/auth/google/personal/callback', { code })
    );
    this.personalConnected.set(true);
  }

  async fetchPersonalCalendars(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ calendars: GoogleCalendarInfo[] }>('/api/calendar/personal/list')
      );
      this.personalCalendars.set(res.calendars ?? []);
    } catch (err) {
      console.error('Failed to fetch personal calendars:', err);
      this.personalCalendars.set([]);
    }
  }

  async setPersonalCalendars(calendars: SelectedCalendar[]): Promise<void> {
    this.personalSelectedCalendars.set(calendars);
    await this.savePersonalSelectedCalendars(calendars);
    await this.fetchAllPersonalEvents();
  }

  async fetchAllPersonalEvents(startDate?: Date, endDate?: Date): Promise<void> {
    const calendars = this.personalSelectedCalendars();
    if (!calendars.length) { this.personalEvents.set([]); return; }
    if (!startDate || !endDate) ({ startDate, endDate } = this.currentWeekRange());

    this.personalLoading.set(true);
    try {
      const results = await Promise.all(
        calendars.map((cal) =>
          firstValueFrom(
            this.http.get<any[]>(`/api/calendar/personal/events/${encodeURIComponent(cal.id)}`, {
              params: { timeMin: startDate!.toISOString(), timeMax: endDate!.toISOString() },
            })
          )
            .then((items) => (items ?? []).flatMap((item) => this.expandEvent(item, cal.color)))
            .catch(() => [] as GoogleCalendarEvent[])
        )
      );
      this.personalEvents.set(results.flat());
    } finally {
      this.personalLoading.set(false);
    }
  }

  async fetchPersonalEventsForRange(calendarId: string, startDate?: Date, endDate?: Date): Promise<void> {
    await this.fetchAllPersonalEvents(startDate, endDate);
  }

  async disconnectPersonal(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/google/personal/disconnect', {}));
    } catch { /* ignore */ }
    await this.savePersonalSelectedCalendars([]);
    this.personalCalendars.set([]);
    this.personalSelectedCalendars.set([]);
    this.personalEvents.set([]);
    this.personalConnected.set(false);
  }

  // ── Persistering av personlig kalender-utvalg i users/{uid} ────────────

  private async loadPersonalSelectedCalendars(): Promise<SelectedCalendar[]> {
    const uid = this.auth.user()?.uid;
    if (!uid) return [];
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const data = snap.data();
      if (Array.isArray(data?.['personalSelectedCalendars'])) {
        return data['personalSelectedCalendars'];
      }
      // Migrate old single-calendar format
      if (data?.['personalCalendarId']) {
        return [{ id: data['personalCalendarId'], color: '#8B5CF6' }];
      }
      return [];
    } catch {
      return [];
    }
  }

  private async savePersonalSelectedCalendars(calendars: SelectedCalendar[]): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, 'users', uid), { personalSelectedCalendars: calendars }, { merge: true });
    } catch (err) {
      console.error('Failed to save personal calendar selection:', err);
    }
  }

  // ── Felles hjelpe-metoder ───────────────────────────────────────────────

  private currentWeekRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { startDate: monday, endDate: sunday };
  }

  private expandEvent(item: any, color: string): GoogleCalendarEvent[] {
    const isAllDay = !!item.start?.date;
    const startStr = item.start?.dateTime ?? item.start?.date ?? '';
    const endStr = item.end?.dateTime ?? item.end?.date ?? '';

    if (isAllDay) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const events: GoogleCalendarEvent[] = [];
      const current = new Date(start);
      const spanStart = startStr.slice(0, 10);
      const spanEnd = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);
      while (current < end) {
        events.push({
          id: item.id, summary: item.summary ?? '', description: item.description ?? '',
          date: current.toISOString().slice(0, 10), startTime: null, endTime: null,
          allDay: true, spanStart, spanEnd, spanStartTime: null, spanEndTime: null,
          location: item.location ?? '', color,
        });
        current.setDate(current.getDate() + 1);
      }
      return events;
    }

    const startDate = startStr.slice(0, 10);
    const startTime = startStr.slice(11, 16);
    const endDate = endStr.slice(0, 10);
    const endTime = endStr ? endStr.slice(11, 16) : null;

    if (startDate === endDate) {
      return [{
        id: item.id, summary: item.summary ?? '', description: item.description ?? '',
        date: startDate, startTime, endTime, allDay: false,
        spanStart: null, spanEnd: null, spanStartTime: null, spanEndTime: null,
        location: item.location ?? '', color,
      }];
    }

    const current = new Date(startDate + 'T00:00:00');
    const endLocal = new Date(endDate + 'T00:00:00');
    const events: GoogleCalendarEvent[] = [];
    let isFirst = true;
    while (current <= endLocal) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const isLast = dateStr === endDate;
      events.push({
        id: item.id, summary: item.summary ?? '', description: item.description ?? '',
        date: dateStr, startTime: isFirst ? startTime : null, endTime: isLast ? endTime : null,
        allDay: !isFirst, spanStart: startDate, spanEnd: endDate,
        spanStartTime: startTime, spanEndTime: endTime,
        location: item.location ?? '', color,
      });
      current.setDate(current.getDate() + 1);
      isFirst = false;
    }
    return events;
  }
}

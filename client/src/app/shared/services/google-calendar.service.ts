import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { SchoolDataService } from './school-data.service';

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
  /** Original start time (HH:MM) for multi-day timed events â€” set on every expanded entry. */
  spanStartTime: string | null;
  /** Original end time (HH:MM) for multi-day timed events â€” set on every expanded entry. */
  spanEndTime: string | null;
  location: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private data = inject(SchoolDataService);

  readonly calendars = signal<GoogleCalendarInfo[]>([]);
  readonly selectedCalendarId = signal<string | null>(null);
  readonly events = signal<GoogleCalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly connected = signal(false);

  readonly isConnected = computed(() => this.connected());

  readonly selectedCalendar = computed(() => {
    const id = this.selectedCalendarId();
    return this.calendars().find((c) => c.id === id) ?? null;
  });

  // No longer needed â€” all users share the same backend token
  readonly needsReconnect = computed(() => false);

  constructor() {
    // Check backend connection status once user is logged in
    effect(() => {
      if (this.auth.isLoggedIn() && !this.auth.loading() && this.data.sharedConfigLoaded()) {
        this.checkStatus();
      }
    });
  }

  /** Call after login to load calendars (kept for backward compat) */
  async initAfterLogin(): Promise<void> {
    await this.checkStatus();
  }

  async checkStatus(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ connected: boolean }>('/api/auth/google/status')
      );
      this.connected.set(res.connected);
      if (res.connected) {
        const calendarId = this.data.googleCalendarId();
        if (calendarId) {
          this.selectedCalendarId.set(calendarId);
          await this.fetchEvents(calendarId);
        } else {
          await this.fetchCalendars();
        }
      }
    } catch {
      this.connected.set(false);
    }
  }

  /** Initiate OAuth flow â€” redirects to Google */
  async startConnectFlow(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ url: string }>('/api/auth/google/url')
    );
    window.location.href = res.url;
  }

  /** Called from GoogleCallbackComponent after redirect */
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
      const cals = res.calendars ?? [];
      this.calendars.set(cals);

      const persistedId = this.data.googleCalendarId();
      if (persistedId && cals.some((c) => c.id === persistedId)) {
        this.selectedCalendarId.set(persistedId);
        await this.fetchEvents(persistedId);
      } else {
        // No saved preference — show primary locally but do NOT persist it;
        // the user must explicitly select a calendar to save a preference.
        const primary = cals.find((c) => c.primary);
        if (primary) {
          this.selectedCalendarId.set(primary.id);
          await this.fetchEvents(primary.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
      this.calendars.set([]);
    }
  }

  async selectCalendar(calendarId: string): Promise<void> {
    this.selectedCalendarId.set(calendarId);
    this.data.setGoogleCalendarId(calendarId);
    await this.fetchEvents(calendarId);
  }

  async fetchEvents(calendarId: string, startDate?: Date, endDate?: Date): Promise<void> {
    if (!startDate || !endDate) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      startDate = monday;
      endDate = sunday;
    }

    this.loading.set(true);
    try {
      const items = await firstValueFrom(
        this.http.get<any[]>(`/api/calendar/events/${encodeURIComponent(calendarId)}`, {
          params: { timeMin: startDate.toISOString(), timeMax: endDate.toISOString() },
        })
      );
      this.events.set((items ?? []).flatMap((item) => this.expandEvent(item)));
    } catch (err) {
      console.error('Failed to fetch events:', err);
      this.events.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async refreshEvents(): Promise<void> {
    const id = this.selectedCalendarId();
    if (id) await this.fetchEvents(id);
  }

  async fetchEventsForRange(calendarId: string, startDate?: Date, endDate?: Date): Promise<void> {
    await this.fetchEvents(calendarId, startDate, endDate);
  }

  async disconnect(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/google/disconnect', {}));
    } catch { /* ignore */ }
    this.calendars.set([]);
    this.selectedCalendarId.set(null);
    this.events.set([]);
    this.connected.set(false);
    this.data.setGoogleCalendarId(null);
  }

  /** No longer needed â€” kept for compat */
  async reconnectCalendar(): Promise<void> {}

  private expandEvent(item: any): GoogleCalendarEvent[] {
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
          id: item.id,
          summary: item.summary ?? '',
          description: item.description ?? '',
          date: current.toISOString().slice(0, 10),
          startTime: null,
          endTime: null,
          allDay: true,
          spanStart,
          spanEnd,
          spanStartTime: null,
          spanEndTime: null,
          location: item.location ?? '',
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
        id: item.id,
        summary: item.summary ?? '',
        description: item.description ?? '',
        date: startDate,
        startTime,
        endTime,
        allDay: false,
        spanStart: null,
        spanEnd: null,
        spanStartTime: null,
        spanEndTime: null,
        location: item.location ?? '',
      }];
    }

    // Multi-day timed event â€” expand across every day
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
        id: item.id,
        summary: item.summary ?? '',
        description: item.description ?? '',
        date: dateStr,
        startTime: isFirst ? startTime : null,
        endTime: isLast ? endTime : null,
        allDay: !isFirst,
        spanStart: startDate,
        spanEnd: endDate,
        spanStartTime: startTime,
        spanEndTime: endTime,
        location: item.location ?? '',
      });
      current.setDate(current.getDate() + 1);
      isFirst = false;
    }
    return events;
  }
}


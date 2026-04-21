import { Injectable, signal, computed, inject, effect } from '@angular/core';
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
  location: string;
}

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private auth = inject(AuthService);
  private data = inject(SchoolDataService);

  readonly calendars = signal<GoogleCalendarInfo[]>([]);
  readonly selectedCalendarId = signal<string | null>(null);
  readonly events = signal<GoogleCalendarEvent[]>([]);
  readonly loading = signal(false);

  readonly isConnected = computed(() => this.auth.hasGoogleToken());

  readonly selectedCalendar = computed(() => {
    const id = this.selectedCalendarId();
    return this.calendars().find((c) => c.id === id) ?? null;
  });

  constructor() {
    // Auto-connect calendar when token and saved calendar ID are both available.
    // This covers page refresh (token restored from sessionStorage) and first login.
    effect(() => {
      const hasToken = this.auth.hasGoogleToken();
      const calendarId = this.data.googleCalendarId();
      if (hasToken && calendarId && this.calendars().length === 0 && !this.loading()) {
        this.selectedCalendarId.set(calendarId);
        this.fetchEvents(calendarId);
      } else if (hasToken && !calendarId && this.calendars().length === 0 && !this.loading()) {
        // No saved calendar yet — fetch calendar list so user can choose (or auto-pick primary)
        this.fetchCalendars();
      }
    });
  }

  /** Call after login to load calendars */
  async initAfterLogin(): Promise<void> {
    const token = this.auth.getGoogleAccessToken();
    if (token) {
      await this.fetchCalendars();
    }
  }

  async fetchCalendars(): Promise<void> {
    const token = await this.getValidToken();
    if (!token) return;

    try {
      const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Calendar API: ${res.status}`);

      const data = await res.json();
      const cals: GoogleCalendarInfo[] = (data.items ?? []).map((item: any) => ({
        id: item.id,
        summary: item.summary ?? '',
        description: item.description ?? '',
        primary: item.primary ?? false,
        backgroundColor: item.backgroundColor ?? '#4285f4',
      }));

      this.calendars.set(cals);

      // Restore persisted selection or default to primary
      const persistedId = this.data.googleCalendarId();
      if (persistedId && cals.some((c) => c.id === persistedId)) {
        this.selectedCalendarId.set(persistedId);
        await this.fetchEvents(persistedId);
      } else {
        const primary = cals.find((c) => c.primary);
        if (primary) {
          await this.selectCalendar(primary.id);
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
    const token = await this.getValidToken();
    if (!token) return;

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
      const params = new URLSearchParams({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });

      const res = await fetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Events API: ${res.status}`);

      const data = await res.json();
      const events: GoogleCalendarEvent[] = (data.items ?? []).flatMap((item: any) => {
        return this.expandEvent(item);
      });

      this.events.set(events);
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

  disconnect(): void {
    this.calendars.set([]);
    this.selectedCalendarId.set(null);
    this.events.set([]);
    this.data.setGoogleCalendarId(null);
  }

  private expandEvent(item: any): GoogleCalendarEvent[] {
    const isAllDay = !!item.start?.date;
    const startStr = item.start?.dateTime ?? item.start?.date ?? '';
    const endStr = item.end?.dateTime ?? item.end?.date ?? '';

    if (isAllDay) {
      // All-day events — Google uses exclusive end date, iterate via local Date
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
          location: item.location ?? '',
        });
        current.setDate(current.getDate() + 1);
      }
      return events;
    }

    // Timed events — extract date and time directly from the ISO string (e.g.
    // "2026-04-20T17:00:00+02:00") to avoid UTC-conversion errors.
    const startDate = startStr.slice(0, 10);
    const startTime = startStr.slice(11, 16);
    const endDate = endStr.slice(0, 10);
    const endTime = endStr ? endStr.slice(11, 16) : null;

    // Single-day timed event
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
        location: item.location ?? '',
      }];
    }

    // Multi-day timed event (e.g. a trip) — expand across every day it spans.
    // Parse as local midnight to avoid DST/timezone issues with getDate().
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
        location: item.location ?? '',
      });
      current.setDate(current.getDate() + 1);
      isFirst = false;
    }
    return events;
  }

  private async getValidToken(): Promise<string | null> {
    let token = this.auth.getGoogleAccessToken();
    if (!token) {
      // Try refreshing
      token = await this.auth.refreshGoogleAccessToken();
    }
    return token;
  }
}

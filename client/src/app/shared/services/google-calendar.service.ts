import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

const GOOGLE_CAL_KEY = 'family_portal_google_calendar';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private http = inject(HttpClient);

  readonly isConnected = signal(false);
  readonly calendars = signal<GoogleCalendarInfo[]>([]);
  readonly selectedCalendarId = signal<string | null>(null);
  readonly events = signal<GoogleCalendarEvent[]>([]);
  readonly loading = signal(false);

  readonly selectedCalendar = computed(() => {
    const id = this.selectedCalendarId();
    return this.calendars().find((c) => c.id === id) ?? null;
  });

  constructor() {
    this.loadPersistedSelection();
    this.checkStatus();
  }

  checkStatus(): void {
    this.http.get<{ connected: boolean }>('/api/auth/google/status').subscribe({
      next: (res) => {
        this.isConnected.set(res.connected);
        if (res.connected) {
          this.fetchCalendars();
        }
      },
      error: () => this.isConnected.set(false),
    });
  }

  startOAuthFlow(): void {
    this.http.get<{ url: string }>('/api/auth/google/url').subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
    });
  }

  disconnect(): void {
    this.http.post('/api/auth/google/disconnect', {}).subscribe({
      next: () => {
        this.isConnected.set(false);
        this.calendars.set([]);
        this.selectedCalendarId.set(null);
        this.events.set([]);
        localStorage.removeItem(GOOGLE_CAL_KEY);
      },
    });
  }

  fetchCalendars(): void {
    this.http.get<{ calendars: GoogleCalendarInfo[] }>('/api/calendar/list').subscribe({
      next: (res) => {
        this.calendars.set(res.calendars);
        // Restore persisted selection or default to primary
        const persisted = this.selectedCalendarId();
        if (persisted && res.calendars.some((c) => c.id === persisted)) {
          this.fetchEvents(persisted);
        } else {
          const primary = res.calendars.find((c) => c.primary);
          if (primary) {
            this.selectCalendar(primary.id);
          }
        }
      },
    });
  }

  selectCalendar(calendarId: string): void {
    this.selectedCalendarId.set(calendarId);
    localStorage.setItem(GOOGLE_CAL_KEY, calendarId);
    this.fetchEvents(calendarId);
  }

  fetchEvents(calendarId: string): void {
    this.fetchEventsForRange(calendarId);
  }

  fetchEventsForRange(calendarId: string, startDate?: Date, endDate?: Date): void {
    const now = new Date();
    if (!startDate || !endDate) {
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

    const params = {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
    };

    this.http
      .get<{ events: GoogleCalendarEvent[] }>(
        `/api/calendar/events/${encodeURIComponent(calendarId)}`,
        { params }
      )
      .subscribe({
        next: (res) => this.events.set(res.events),
        error: () => this.events.set([]),
      });
  }

  refreshEvents(): void {
    const id = this.selectedCalendarId();
    if (id) this.fetchEvents(id);
  }

  private loadPersistedSelection(): void {
    const saved = localStorage.getItem(GOOGLE_CAL_KEY);
    if (saved) this.selectedCalendarId.set(saved);
  }
}

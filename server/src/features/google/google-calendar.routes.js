import { Router } from 'express';
import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth.routes.js';

const router = Router();

function requireAuth(req, res, next) {
  getAuthenticatedClient().then((client) => {
    if (!client) {
      return res.status(401).json({ error: 'Ikke koblet til Google-konto. Vennligst koble til på nytt via Innstillinger.' });
    }
    req.googleAuth = client;
    next();
  }).catch((err) => {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ error: 'Autentisering feilet. Vennligst koble til Google på nytt.' });
  });
}

// GET /api/calendar/list — all calendars for the user
router.get('/list', requireAuth, async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: req.googleAuth });
    const result = await calendar.calendarList.list();
    const calendars = (result.data.items ?? []).map((c) => ({
      id: c.id,
      summary: c.summary,
      description: c.description ?? '',
      primary: c.primary ?? false,
      backgroundColor: c.backgroundColor ?? '#4285F4',
    }));
    res.json({ calendars });
  } catch (err) {
    console.error('Calendar list failed:', err.response?.status ?? '', err);
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Google-tilgang utløpt. Koble til på nytt via Innstillinger.' });
    }
    res.status(500).json({ error: 'Kunne ikke hente kalendere.' });
  }
});

// GET /api/calendar/events/:calendarId — events for a specific calendar
router.get('/events/:calendarId', requireAuth, async (req, res) => {
  try {
    const { calendarId } = req.params;
    const { timeMin, timeMax } = req.query;

    const calendar = google.calendar({ version: 'v3', auth: req.googleAuth });
    const result = await calendar.events.list({
      calendarId: decodeURIComponent(calendarId),
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || undefined,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    const events = [];
    for (const e of (result.data.items ?? [])) {
      const isAllDay = !e.start?.dateTime;
      const startStr = e.start?.dateTime ?? e.start?.date ?? '';
      const endStr = e.end?.date ?? '';

      if (isAllDay && endStr) {
        // Google Calendar end.date is exclusive, so a 3-day event from Apr 20-22 has end.date = Apr 23
        const spanStart = startStr;
        const lastDay = new Date(endStr + 'T00:00:00Z');
        lastDay.setUTCDate(lastDay.getUTCDate() - 1);
        const spanEnd = lastDay.toISOString().slice(0, 10);

        const current = new Date(startStr + 'T00:00:00Z');
        const endDate = new Date(endStr + 'T00:00:00Z');
        while (current < endDate) {
          const dateStr = current.toISOString().slice(0, 10);
          events.push({
            id: e.id + '_' + dateStr,
            summary: e.summary ?? '(Uten tittel)',
            description: e.description ?? '',
            date: dateStr,
            startTime: null,
            endTime: null,
            allDay: true,
            spanStart,
            spanEnd,
            location: e.location ?? '',
          });
          current.setUTCDate(current.getUTCDate() + 1);
        }
      } else {
        const startDateStr = startStr.slice(0, 10);
        const endDateStr = (e.end?.dateTime ?? '').slice(0, 10);

        if (endDateStr && endDateStr > startDateStr) {
          // Timed event spanning multiple days — expand to one entry per day
          const current = new Date(startDateStr + 'T00:00:00Z');
          const endDate = new Date(endDateStr + 'T00:00:00Z');
          while (current <= endDate) {
            const dateStr = current.toISOString().slice(0, 10);
            events.push({
              id: e.id + '_' + dateStr,
              summary: e.summary ?? '(Uten tittel)',
              description: e.description ?? '',
              date: dateStr,
              startTime: e.start?.dateTime ?? null,
              endTime: e.end?.dateTime ?? null,
              allDay: false,
              location: e.location ?? '',
            });
            current.setUTCDate(current.getUTCDate() + 1);
          }
        } else {
          events.push({
            id: e.id,
            summary: e.summary ?? '(Uten tittel)',
            description: e.description ?? '',
            date: startDateStr,
            startTime: e.start?.dateTime ?? null,
            endTime: e.end?.dateTime ?? null,
            allDay: false,
            location: e.location ?? '',
          });
        }
      }
    }

    res.json({ events });
  } catch (err) {
    console.error('Calendar events failed:', err.response?.status ?? '', err);
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Google-tilgang utløpt. Koble til på nytt via Innstillinger.' });
    }
    res.status(500).json({ error: 'Kunne ikke hente hendelser.' });
  }
});

export const googleCalendarRouter = router;

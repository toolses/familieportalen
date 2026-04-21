import { Router } from 'express';
import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth.routes.js';

const router = Router();

function requireAuth(req, res, next) {
  getAuthenticatedClient()
    .then((client) => {
      if (!client) {
        return res.status(401).json({ error: 'Kalender ikke koblet til. Koble til via Innstillinger.' });
      }
      req.googleAuth = client;
      next();
    })
    .catch((err) => {
      console.error('Google auth middleware error:', err.message);
      res.status(401).json({ error: 'Google-autentisering feilet. Prøv å koble til på nytt.' });
    });
}

// GET /api/calendar/list
router.get('/list', requireAuth, async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: req.googleAuth });
    const result = await calendar.calendarList.list();
    const calendars = (result.data.items ?? []).map((c) => ({
      id: c.id,
      summary: c.summary ?? '',
      description: c.description ?? '',
      primary: c.primary ?? false,
      backgroundColor: c.backgroundColor ?? '#4285F4',
    }));
    res.json({ calendars });
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Google-tilgang utløpt. Koble til på nytt.' });
    }
    console.error('Calendar list failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente kalendere.' });
  }
});

// GET /api/calendar/events/:calendarId — raw items, frontend handles expansion
router.get('/events/:calendarId', requireAuth, async (req, res) => {
  const { calendarId } = req.params;
  const { timeMin, timeMax } = req.query;

  try {
    const calendar = google.calendar({ version: 'v3', auth: req.googleAuth });
    const result = await calendar.events.list({
      calendarId: decodeURIComponent(calendarId),
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || undefined,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    res.json(result.data.items ?? []);
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Google-tilgang utløpt. Koble til på nytt.' });
    }
    console.error('Calendar events failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente hendelser.' });
  }
});

export const googleCalendarRouter = router;

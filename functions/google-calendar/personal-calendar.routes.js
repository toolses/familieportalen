import { Router } from 'express';
import { google } from 'googleapis';
import { getPersonalAuthenticatedClient } from './personal-auth.routes.js';

const router = Router();

function requirePersonalAuth(req, res, next) {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Ikke autentisert.' });
  getPersonalAuthenticatedClient(uid)
    .then((client) => {
      if (!client) {
        return res.status(401).json({ error: 'Personlig kalender ikke koblet til.' });
      }
      req.googleAuth = client;
      next();
    })
    .catch((err) => {
      console.error('Personal auth middleware error:', err.message);
      res.status(401).json({ error: 'Google-autentisering feilet.' });
    });
}

// GET /api/calendar/personal/list
router.get('/list', requirePersonalAuth, async (req, res) => {
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
    console.error('Personal calendar list failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente kalendere.' });
  }
});

// GET /api/calendar/personal/events/:calendarId
router.get('/events/:calendarId', requirePersonalAuth, async (req, res) => {
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
    console.error('Personal calendar events failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente hendelser.' });
  }
});

export const personalCalendarRouter = router;

import 'dotenv/config';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import express from 'express';
import cors from 'cors';

// Initialize Firebase Admin
initializeApp();

// ── Auth middleware ──────────────────────────────────────────
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ingen gyldig autentisering. Logg inn på nytt.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Ugyldig eller utløpt token. Logg inn på nytt.' });
  }
}

// ── Build Express app ───────────────────────────────────────

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Health check (no auth required)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Protected routes
app.use('/api/school-plan', verifyFirebaseToken);
app.use('/api/auth/google', verifyFirebaseToken);
app.use('/api/calendar', verifyFirebaseToken);
app.use('/api/notifications', verifyFirebaseToken);

// Dynamically import school plan service
const { schoolPlanRouter } = await import('./school-plan/school-plan.routes.js');
app.use('/api/school-plan', schoolPlanRouter);

const { googleAuthRouter } = await import('./google-calendar/google-auth.routes.js');
app.use('/api/auth/google', googleAuthRouter);

const { googleCalendarRouter } = await import('./google-calendar/google-calendar.routes.js');
app.use('/api/calendar', googleCalendarRouter);

const { notificationsRouter } = await import('./notifications/notifications.routes.js');
app.use('/api/notifications', notificationsRouter);

// Error handlers
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Ugyldig JSON i forespørselen.' });
  }
  next(err);
});

app.use((err, req, res, next) => {
  console.error(`[500] ${req.method} ${req.path} —`, err);
  res.status(500).json({ error: 'En uventet serverfeil oppstod.' });
});

// Export as Gen 2 Cloud Function
// invoker: 'public' is required for Firebase Hosting rewrites to reach the function.
// App-level auth (verifyFirebaseToken) still enforces user authentication.
export const api = onRequest({ region: 'europe-west1', memory: '512MiB', invoker: 'public' }, app);

// ── Scheduled push notifications ────────────────────────────────────────────
export { notifyEveBeforeSwitch, notifyOnSwitchDay } from './notifications/scheduled-notifications.js';

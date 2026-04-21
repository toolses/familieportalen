import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { schoolPlanRouter } from './features/school-plan/school-plan.routes.js';
import { googleAuthRouter } from './features/google/google-auth.routes.js';
import { googleCalendarRouter } from './features/google/google-calendar.routes.js';

process.on('uncaughtException', (err) => {
  console.error('[CRASH] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] unhandledRejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/school-plan', schoolPlanRouter);
app.use('/api/auth/google', googleAuthRouter);
app.use('/api/calendar', googleCalendarRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Handle JSON parse errors from express.json()
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    console.error('[400] Ugyldig JSON i request body:', err.message);
    return res.status(400).json({ error: 'Ugyldig JSON i forespørselen.' });
  }
  next(err);
});

// Global error handler — catches any unhandled errors passed via next(err)
app.use((err, req, res, next) => {
  console.error(`[500] ${req.method} ${req.path} —`, err);
  res.status(500).json({ error: 'En uventet serverfeil oppstod.' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

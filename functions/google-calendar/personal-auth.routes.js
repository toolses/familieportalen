import { Router } from 'express';
import { google } from 'googleapis';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DEFAULT_REDIRECT_URI = 'https://familieportalen-11d5e.web.app/google-callback';
const PERSONAL_CAL_FIELD = 'personalCalendar';

function getRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI;
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(),
  );
}

export async function getPersonalAuthenticatedClient(uid) {
  const db = getFirestore();
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  const pc = snap.data()?.[PERSONAL_CAL_FIELD];
  if (!pc?.refreshToken) return null;

  const client = createOAuth2Client();
  client.setCredentials({
    refresh_token: pc.refreshToken,
    access_token: pc.accessToken ?? null,
    expiry_date: pc.expiryDate ?? null,
  });

  client.on('tokens', async (tokens) => {
    try {
      await db.doc(`users/${uid}`).update({
        [`${PERSONAL_CAL_FIELD}.accessToken`]: tokens.access_token ?? null,
        [`${PERSONAL_CAL_FIELD}.expiryDate`]: tokens.expiry_date ?? null,
        [`${PERSONAL_CAL_FIELD}.updatedAt`]: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to update personal token:', err.message);
    }
  });

  return client;
}

const router = Router();

// GET /api/auth/google/personal/url
router.get('/url', (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google Kalender-integrasjon er ikke konfigurert på serveren.' });
  }
  const redirectUri = getRedirectUri();
  const client = createOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    redirect_uri: redirectUri,
    state: 'personal',
  });
  res.json({ url });
});

// POST /api/auth/google/personal/callback
router.post('/callback', async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Ikke autentisert.' });
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Mangler autorisasjonskode.' });

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).json({ error: 'Ingen refresh token mottatt. Tilbakekall tilgang i Google og koble til på nytt.' });
    }

    const db = getFirestore();
    await db.doc(`users/${uid}`).set({
      [PERSONAL_CAL_FIELD]: {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token ?? null,
        expiryDate: tokens.expiry_date ?? null,
        updatedAt: new Date().toISOString(),
      },
    }, { merge: true });

    res.json({ success: true });
  } catch (err) {
    console.error('Personal token exchange failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke koble til Google-konto.' });
  }
});

// GET /api/auth/google/personal/status
router.get('/status', async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.json({ connected: false });
  try {
    const db = getFirestore();
    const snap = await db.doc(`users/${uid}`).get();
    res.json({ connected: !!snap.data()?.[PERSONAL_CAL_FIELD]?.refreshToken });
  } catch {
    res.json({ connected: false });
  }
});

// POST /api/auth/google/personal/disconnect
router.post('/disconnect', async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Ikke autentisert.' });
  try {
    const db = getFirestore();
    await db.doc(`users/${uid}`).update({ [PERSONAL_CAL_FIELD]: FieldValue.delete() });
    res.json({ success: true });
  } catch (err) {
    console.error('Personal disconnect failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke koble fra kalender.' });
  }
});

export const personalAuthRouter = router;

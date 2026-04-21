import { Router } from 'express';
import { google } from 'googleapis';
import { getFirestore } from 'firebase-admin/firestore';

// Firestore path — only accessible via Admin SDK (bypasses client rules)
const TOKEN_DOC = 'config/googleCalendar';

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? 'https://familieportalen-11d5e.web.app/google-callback',
  );
}

export async function getAuthenticatedClient() {
  const db = getFirestore();
  const snap = await db.doc(TOKEN_DOC).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data?.refreshToken) return null;

  const client = createOAuth2Client();
  client.setCredentials({
    refresh_token: data.refreshToken,
    access_token: data.accessToken ?? null,
    expiry_date: data.expiryDate ?? null,
  });

  // Persist refreshed tokens back to Firestore
  client.on('tokens', async (tokens) => {
    try {
      await db.doc(TOKEN_DOC).update({
        accessToken: tokens.access_token ?? null,
        expiryDate: tokens.expiry_date ?? null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to update refreshed token in Firestore:', err.message);
    }
  });

  return client;
}

const router = Router();

// GET /api/auth/google/url
router.get('/url', (_req, res) => {
  const client = createOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  res.json({ url });
});

// POST /api/auth/google/callback
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Mangler autorisasjonskode.' });

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).json({ error: 'Ingen refresh token mottatt. Tilbakekall tilgang i Google og koble til på nytt.' });
    }

    const db = getFirestore();
    await db.doc(TOKEN_DOC).set({
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      expiryDate: tokens.expiry_date ?? null,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Google token exchange failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke koble til Google-konto.' });
  }
});

// GET /api/auth/google/status
router.get('/status', async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.doc(TOKEN_DOC).get();
    res.json({ connected: snap.exists && !!snap.data()?.refreshToken });
  } catch {
    res.json({ connected: false });
  }
});

// POST /api/auth/google/disconnect
router.post('/disconnect', async (_req, res) => {
  try {
    const db = getFirestore();
    await db.doc(TOKEN_DOC).delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Disconnect failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke koble fra kalender.' });
  }
});

export const googleAuthRouter = router;

import { Router } from 'express';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = Router();

// Dev: single in-memory store (no real per-user auth in dev mode)
const TOKENS_FILE = join(process.cwd(), '.personal-google-tokens.json');

function loadTokens() {
  try {
    if (existsSync(TOKENS_FILE)) return JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  } catch { /* ignore */ }
  return null;
}

function saveTokens(tokens) {
  try {
    writeFileSync(TOKENS_FILE, JSON.stringify(tokens), 'utf8');
  } catch (err) {
    console.error('Failed to save personal Google tokens:', err.message);
  }
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4200/google-callback',
  );
}

let storedTokens = loadTokens();

export async function getPersonalAuthenticatedClient() {
  if (!storedTokens) return null;
  const client = createOAuth2Client();
  client.setCredentials(storedTokens);

  client.on('tokens', (tokens) => {
    storedTokens = { ...storedTokens, ...tokens };
    saveTokens(storedTokens);
  });

  const now = Date.now();
  const expiresAt = storedTokens.expiry_date ?? 0;
  if (expiresAt > 0 && expiresAt - now < 60_000 && storedTokens.refresh_token) {
    try {
      const { credentials } = await client.refreshAccessToken();
      storedTokens = { ...storedTokens, ...credentials };
      client.setCredentials(storedTokens);
    } catch (err) {
      console.error('Failed to refresh personal Google token:', err.message);
      return null;
    }
  }

  return client;
}

// GET /api/auth/google/personal/url
router.get('/url', (_req, res) => {
  const client = createOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4200/google-callback',
    state: 'personal',
  });
  res.json({ url });
});

// POST /api/auth/google/personal/callback
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Mangler autorisasjonskode.' });
  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    storedTokens = tokens;
    saveTokens(tokens);
    res.json({ success: true });
  } catch (err) {
    console.error('Personal token exchange failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke koble til Google-konto.' });
  }
});

// GET /api/auth/google/personal/status
router.get('/status', (_req, res) => {
  res.json({ connected: !!storedTokens });
});

// POST /api/auth/google/personal/disconnect
router.post('/disconnect', (_req, res) => {
  storedTokens = null;
  try { writeFileSync(TOKENS_FILE, 'null', 'utf8'); } catch { /* ignore */ }
  res.json({ success: true });
});

export const personalAuthRouter = router;

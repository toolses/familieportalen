import { Router } from 'express';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = Router();

const TOKENS_FILE = join(process.cwd(), '.google-tokens.json');

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
    console.error('Failed to save Google tokens:', err.message);
  }
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4200/google-callback'
  );
}

// In-memory cache loaded from file on startup
let storedTokens = loadTokens();

export async function getAuthenticatedClient() {
  if (!storedTokens) return null;
  const client = createOAuth2Client();
  client.setCredentials(storedTokens);

  // Persist refreshed tokens
  client.on('tokens', (tokens) => {
    console.log('Google tokens refreshed, has refresh_token:', !!tokens.refresh_token);
    storedTokens = { ...storedTokens, ...tokens };
    saveTokens(storedTokens);
  });

  // Proactively refresh if access token is expired or about to expire
  const now = Date.now();
  const expiresAt = storedTokens.expiry_date ?? 0;
  if (expiresAt > 0 && expiresAt - now < 60_000) {
    // Token expired or expiring within 60s — force refresh
    if (storedTokens.refresh_token) {
      try {
        console.log('Proactively refreshing expired Google access token...');
        const { credentials } = await client.refreshAccessToken();
        storedTokens = { ...storedTokens, ...credentials };
        client.setCredentials(storedTokens);
        console.log('Token refreshed successfully, new expiry:', new Date(storedTokens.expiry_date).toISOString());
      } catch (err) {
        console.error('Failed to refresh Google token:', err.message);
        return null;
      }
    } else {
      console.error('Access token expired but no refresh_token available');
      return null;
    }
  }

  return client;
}

// GET /api/auth/google/url — returns the OAuth consent URL
router.get('/url', (_req, res) => {
  const client = createOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  res.json({ url });
});

// POST /api/auth/google/callback — exchange authorization code for tokens
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Mangler autorisasjonskode.' });
  }
  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    storedTokens = tokens;
    saveTokens(tokens);
    console.log('Google tokens stored. Has refresh_token:', !!tokens.refresh_token, 'Expiry:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none');
    res.json({ success: true });
  } catch (err) {
    console.error('Google token exchange failed:', err.message);
    res.status(500).json({ error: 'Kunne ikke koble til Google-konto.' });
  }
});

// GET /api/auth/google/status — check if connected
router.get('/status', (_req, res) => {
  res.json({ connected: !!storedTokens });
});

// POST /api/auth/google/disconnect — clear tokens
router.post('/disconnect', (_req, res) => {
  storedTokens = null;
  try {
    writeFileSync(TOKENS_FILE, 'null', 'utf8');
  } catch { /* ignore */ }
  res.json({ success: true });
});

export const googleAuthRouter = router;

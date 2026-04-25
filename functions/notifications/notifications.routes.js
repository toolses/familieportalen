import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { reminderOccursOnDate } from './scheduled-notifications.js';

export const notificationsRouter = Router();

/**
 * POST /api/notifications/send
 * Body: { uid: string, title: string, body: string }
 *
 * Sender en push-notifikasjon til alle FCM-tokens registrert for brukeren.
 * Kun autorisert brukere kan sende til seg selv (uid validert fra token).
 */
notificationsRouter.post('/send', async (req, res) => {
  const callerUid = req.user.uid;
  const { uid, title, body } = req.body;

  // En bruker kan kun sende varsler til seg selv
  if (!uid || uid !== callerUid) {
    return res.status(403).json({ error: 'Du kan kun sende varsler til deg selv.' });
  }
  if (!title || !body) {
    return res.status(400).json({ error: 'Feltene "title" og "body" er påkrevd.' });
  }

  const db = getFirestore();
  const userDoc = await db.doc(`users/${uid}`).get();
  const tokens = userDoc.data()?.fcmTokens ?? [];

  if (tokens.length === 0) {
    return res.status(200).json({ message: 'Ingen registrerte enheter for denne brukeren.' });
  }

  const messaging = getMessaging();

  // sendEachForMulticast erstatter sendMulticast i nyere firebase-admin
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      },
    },
  });

  // Rydd opp utløpte/ugyldige tokens
  const invalidTokens = [];
  response.responses.forEach((r, idx) => {
    if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(tokens[idx]);
    }
  });

  if (invalidTokens.length > 0) {
    const validTokens = tokens.filter((t) => !invalidTokens.includes(t));
    await db.doc(`users/${uid}`).update({ fcmTokens: validTokens });
  }

  return res.json({
    sent: response.successCount,
    failed: response.failureCount,
  });
});

/**
 * POST /api/notifications/trigger-daily-reminders
 * Kjører daglig påminnelsesvarsel manuelt for innlogget bruker.
 */
notificationsRouter.post('/trigger-daily-reminders', async (req, res) => {
  const uid = req.user.uid;
  const db = getFirestore();

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

  const userDoc = await db.doc(`users/${uid}`).get();
  const userData = userDoc.data() ?? {};
  const tokens = userData.fcmTokens ?? [];

  if (tokens.length === 0) {
    return res.status(200).json({ message: 'Ingen registrerte enheter.' });
  }

  const reminders = userData.manualReminders ?? [];
  const todaysReminders = reminders.filter((r) => r.notify && reminderOccursOnDate(r, today));

  if (todaysReminders.length === 0) {
    return res.status(200).json({ message: 'Ingen påminnelsesvarsler for i dag.' });
  }

  let title, body;
  if (todaysReminders.length === 1) {
    const r = todaysReminders[0];
    title = `🔔 ${r.title}`;
    body = r.description || 'Du har en påminnelse i dag.';
  } else {
    title = `🔔 ${todaysReminders.length} påminnelser i dag`;
    body = todaysReminders.map((r) => r.title).join(', ');
  }

  const messaging = getMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
      fcmOptions: { link: '/' },
    },
  });

  return res.json({ sent: response.successCount, failed: response.failureCount });
});

 * Sender et test-varsel til den innloggede brukeren selv.
 * Nyttig under utvikling og testing.
 */
notificationsRouter.post('/test', async (req, res) => {
  const uid = req.user.uid;

  const db = getFirestore();
  const userDoc = await db.doc(`users/${uid}`).get();
  const tokens = userDoc.data()?.fcmTokens ?? [];

  if (tokens.length === 0) {
    return res.status(200).json({ message: 'Ingen registrerte enheter. Aktivér push-varsler i appen først.' });
  }

  const messaging = getMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'Byttedag i morgen! 🔄',
      body: 'Husk å sjekke pakkelisten for barna.',
    },
    webpush: {
      notification: {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      },
    },
  });

  return res.json({
    message: 'Test-varsel sendt',
    sent: response.successCount,
    failed: response.failureCount,
  });
});

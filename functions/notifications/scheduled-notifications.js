import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// ── Dato-hjelper ──────────────────────────────────────────────────────────────

/**
 * Returnerer en ISO-datostreng (YYYY-MM-DD) offset med `days` fra `date`.
 * @param {Date} date
 * @param {number} days  Positiv = fremover, negativ = bakover
 * @returns {string}
 */
function isoDateOffset(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returnerer dagens dato som ISO-streng i Europe/Oslo-tidssone. */
function todayOslo() {
  return new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }); // sv-SE gir YYYY-MM-DD
}

// ── Samværs-beregning (speiler ResidencyService på klienten) ──────────────────

/**
 * Beregner hvem som har barna på en gitt dato basert på Firestore-brukerdata.
 *
 * @param {string} dateStr  ISO-dato (YYYY-MM-DD)
 * @param {{ baseRotation, residencyOverrides, householdLabel }} userData
 * @returns {'Mamma' | 'Pappa' | null}
 */
function computeResidency(dateStr, userData) {
  const { baseRotation, residencyOverrides = {}, householdLabel = null } = userData;

  if (dateStr in residencyOverrides) return residencyOverrides[dateStr];
  if (!baseRotation) return householdLabel;

  const startMs = new Date(baseRotation.startDate + 'T00:00:00').getTime();
  const dateMs = new Date(dateStr + 'T00:00:00').getTime();
  const diffDays = Math.round((dateMs - startMs) / 86400000);
  const slot = Math.floor(diffDays / 14);
  const isEvenSlot = ((slot % 2) + 2) % 2 === 0;

  return isEvenSlot
    ? baseRotation.startLabel
    : baseRotation.startLabel === 'Mamma' ? 'Pappa' : 'Mamma';
}

// ── FCM-sending med token-opprydding ─────────────────────────────────────────

/**
 * Sender et multicast-varsel og rydder opp ugyldige tokens fra Firestore.
 *
 * @param {string} uid
 * @param {string[]} tokens
 * @param {object} messagePayload  Felter for sendEachForMulticast (uten `tokens`)
 * @param {FirebaseFirestore.Firestore} db
 */
async function sendAndCleanTokens(uid, tokens, messagePayload, db) {
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const messaging = getMessaging();
  const response = await messaging.sendEachForMulticast({ ...messagePayload, tokens });

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

  return { sent: response.successCount, failed: response.failureCount };
}

// ── Felles kjernelogikk ───────────────────────────────────────────────────────

/**
 * Itererer alle brukere, sammenligner samværsstatus for to datoer,
 * og sender varsel dersom de er ulike (= det er en byttedato involvert).
 *
 * @param {string} dateA  ISO-dato som sammenlignes mot dateB
 * @param {string} dateB  ISO-dato som sammenlignes mot dateA
 * @param {(currentParent: string, userData: object) => object} buildPayload
 *   Funksjon som bygger FCM-payload basert på hvem som har barna på dateB.
 */
export { computeResidency };

export async function checkResidencyAndNotify(dateA, dateB, buildPayload) {
  const db = getFirestore();
  const usersSnap = await db.collection('users').get();

  let totalSent = 0;
  let totalFailed = 0;
  let notified = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const tokens = userData.fcmTokens ?? [];

    if (tokens.length === 0) continue;

    const residencyA = computeResidency(dateA, userData);
    const residencyB = computeResidency(dateB, userData);

    // Ingen byttedag hvis begge datoene har samme (eller ukjent) forelder
    if (!residencyA || !residencyB || residencyA === residencyB) continue;

    const payload = buildPayload(residencyB, userData);
    const { sent, failed } = await sendAndCleanTokens(uid, tokens, payload, db);
    totalSent += sent;
    totalFailed += failed;
    notified++;
  }

  console.log(
    `[scheduled-notifications] Varslet ${notified} bruker(e). Sendt: ${totalSent}, feilet: ${totalFailed}.`
  );
}

// ── Hjelper: sjekker om en påminnelse forekommer på en gitt dato ─────────────

/**
 * Speiler reminderOccursOnDate-logikken fra klienten.
 * @param {{ date: string, recurrence: { type: string } | null }} reminder
 * @param {string} date  ISO-dato (YYYY-MM-DD)
 */
export function reminderOccursOnDate(reminder, date) {
  if (!reminder.recurrence) return reminder.date === date;
  const startMs = new Date(reminder.date + 'T00:00:00Z').getTime();
  const checkMs = new Date(date + 'T00:00:00Z').getTime();
  if (checkMs < startMs) return false;
  if (new Date(reminder.date + 'T00:00:00Z').getUTCDay() !== new Date(date + 'T00:00:00Z').getUTCDay()) return false;
  const diffWeeks = Math.round((checkMs - startMs) / (7 * 24 * 60 * 60 * 1000));
  if (reminder.recurrence.type === 'weekly') return true;
  return diffWeeks % 2 === 0;
}

// ── Eksporterte Cloud Functions ───────────────────────────────────────────────

/** Kl. 19:00 — Varsler kvelden FØR byttedagen */
export const notifyEveBeforeSwitch = onSchedule(
  { schedule: '0 19 * * *', timeZone: 'Europe/Oslo', region: 'europe-west1' },
  async () => {
    const today = todayOslo();
    const tomorrow = isoDateOffset(new Date(today), 1);
    console.log(`[notifyEveBeforeSwitch] Sjekker ${today} → ${tomorrow}`);

    await checkResidencyAndNotify(today, tomorrow, (tomorrowParent) => ({
      notification: {
        title: 'Byttedag i morgen! 🔄',
        body: `I morgen tar ${tomorrowParent} over. Husk å pakke for barna!`,
      },
      webpush: {
        notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
        fcmOptions: { link: '/dashboard' },
      },
    }));
  }
);

/** Kl. 14:00 — Varsler PÅ selve byttedagen */
export const notifyOnSwitchDay = onSchedule(
  { schedule: '0 14 * * *', timeZone: 'Europe/Oslo', region: 'europe-west1' },
  async () => {
    const today = todayOslo();
    const yesterday = isoDateOffset(new Date(today), -1);
    console.log(`[notifyOnSwitchDay] Sjekker ${yesterday} → ${today}`);

    await checkResidencyAndNotify(yesterday, today, (currentParent) => ({
      notification: {
        title: 'Byttedag! 🔄',
        body: `I dag tar ${currentParent} over. Husk å hente barna!`,
      },
      webpush: {
        notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
        fcmOptions: { link: '/dashboard' },
      },
    }));
  }
);

/** Kl. 06:00 — Sender ett daglig push-varsel med dagens påminnelser */
export const notifyDailyReminders = onSchedule(
  { schedule: '0 6 * * *', timeZone: 'Europe/Oslo', region: 'europe-west1' },
  async () => {
    const today = todayOslo();
    const db = getFirestore();

    // Hent alle husstander med manualReminders
    const householdsSnap = await db.collection('households').get();

    let totalSent = 0;

    for (const householdDoc of householdsSnap.docs) {
      const householdId = householdDoc.id;
      const householdData = householdDoc.data();
      const reminders = householdData.manualReminders ?? [];

      const todaysReminders = reminders.filter(
        (r) => r.notify && reminderOccursOnDate(r, today)
      );
      if (todaysReminders.length === 0) continue;

      let title, body;
      if (todaysReminders.length === 1) {
        const r = todaysReminders[0];
        title = `🔔 ${r.title}`;
        body = r.description || 'Du har en påminnelse i dag.';
      } else {
        title = `🔔 ${todaysReminders.length} påminnelser i dag`;
        body = todaysReminders.map((r) => r.title).join(', ');
      }

      // Finn alle brukere i denne husstanden og send til deres FCM-tokens
      const members = householdData.members ?? [];
      for (const member of members) {
        const userDoc = await db.doc(`users/${member.uid}`).get();
        const tokens = userDoc.data()?.fcmTokens ?? [];
        if (tokens.length === 0) continue;

        const { sent } = await sendAndCleanTokens(member.uid, tokens, {
          notification: { title, body },
          webpush: {
            notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
            fcmOptions: { link: '/' },
          },
        }, db);
        totalSent += sent;
      }
    }

    console.log(`[notifyDailyReminders] Sendt ${totalSent} varsel(er) for ${today}.`);
  }
);

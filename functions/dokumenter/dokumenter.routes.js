import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const dokumenterRouter = Router();

/**
 * POST /api/dokumenter/notify-upload
 * Sender push-varsel til alle andre husstandsmedlemmer om nytt dokument.
 */
dokumenterRouter.post('/notify-upload', async (req, res) => {
  const callerUid = req.user.uid;
  const { householdId, documentTitle, uploaderName } = req.body;

  if (!householdId || !documentTitle) {
    return res.status(400).json({ error: 'householdId og documentTitle er påkrevd.' });
  }

  const db = getFirestore();
  const householdDoc = await db.doc(`households/${householdId}`).get();
  const householdData = householdDoc.data();

  if (!householdData || !householdData.memberUids?.includes(callerUid)) {
    return res.status(403).json({ error: 'Ingen tilgang til denne husstanden.' });
  }

  const otherUids = (householdData.memberUids ?? []).filter((uid) => uid !== callerUid);
  if (otherUids.length === 0) {
    return res.json({ sent: 0, message: 'Ingen andre medlemmer å varsle.' });
  }

  const allTokens = [];
  for (const uid of otherUids) {
    const userDoc = await db.doc(`users/${uid}`).get();
    const tokens = userDoc.data()?.fcmTokens ?? [];
    allTokens.push(...tokens);
  }

  if (allTokens.length === 0) {
    return res.json({ sent: 0, message: 'Ingen registrerte enheter hos andre medlemmer.' });
  }

  const messaging = getMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens: allTokens,
    notification: {
      title: '📄 Nytt dokument',
      body: `${uploaderName} har lagt til «${documentTitle}» i arkivet.`,
    },
    webpush: {
      notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
      fcmOptions: { link: '/dokumenter' },
    },
  });

  return res.json({ sent: response.successCount, failed: response.failureCount });
});

// Firebase Cloud Messaging Service Worker
// Håndterer bakgrunnsvarsler når appen ikke er aktiv i forgrunnen.
// Denne filen MÅ ligge på rot-URLen (/firebase-messaging-sw.js).

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA_Bnd9r48jSrXDZE1e2I5wEqXlOt1RBDg',
  authDomain: 'familieportalen-11d5e.firebaseapp.com',
  projectId: 'familieportalen-11d5e',
  storageBucket: 'familieportalen-11d5e.firebasestorage.app',
  messagingSenderId: '745029363713',
  appId: '1:745029363713:web:06c83c8f351e5d69077800',
});

const messaging = firebase.messaging();

// Håndter bakgrunnsmeldinger (appen er lukket eller i bakgrunnen)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Bakgrunnsmelding mottatt:', payload);

  const notificationTitle = payload.notification?.title ?? 'Familieportalen';
  const notificationOptions = {
    body: payload.notification?.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data ?? {},
    tag: 'familieportalen-notification',
    renotify: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Åpne/fokuser appen når brukeren trykker på varselet
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

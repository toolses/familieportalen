import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { environment } from '../../environments/environment';

// Initialiseres én gang her, slik at alle tjenester bruker samme instans
// med persistent lokal cache (IndexedDB) for offline-støtte og raskere start.
export const firebaseApp = initializeApp(environment.firebase);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache(),
  databaseId: environment.firestoreDatabaseId,
});

// src/firebase/client.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'fake-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'localhost',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'friendsnavigator-dev',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'friendsnavigator-dev.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (typeof window !== 'undefined') {
  console.log('Firebase Env:', {
    USE_EMULATOR: useEmulator,
    API_KEY_PRESENT: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    TOMTOM_KEY_PRESENT: !!process.env.NEXT_PUBLIC_TOMTOM_API_KEY
  });
}

if (useEmulator) {
  const FIRESTORE_HOST = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost';
  const FIRESTORE_PORT = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || 8080);
  const AUTH_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'localhost';
  const AUTH_PORT = Number(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULator_port || 9099);
  
  try {
    // These checks prevent errors if the SDK is used in a server environment by mistake.
    if (typeof window !== 'undefined') {
      console.log(`Connecting Auth emulator to: http://${AUTH_HOST}:${AUTH_PORT}`);
      connectAuthEmulator(auth, `http://${AUTH_HOST}:${AUTH_PORT}`, { disableWarnings: true });
    }
  } catch (err) {
    console.error("Auth emulator connect error:", err);
  }

  try {
     if (typeof window !== 'undefined') {
        console.log(`Connecting Firestore emulator to: ${FIRESTORE_HOST}:${FIRESTORE_PORT}`);
        connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);
        // @ts-ignore - This is a valid setting for web
        db.settings?.({ experimentalForceLongPolling: true });
        console.log('Successfully configured connection to Firestore emulator with long-polling enabled.');
      }
  } catch (err) {
    console.error("Firestore emulator connect error:", err);
  }
} else {
  if (typeof window !== 'undefined') {
    console.log('Using cloud Firebase config. Emulators are not connected.');
  }
}

// Only attempt persistence in browser environments
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one.
      // This is an expected condition.
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence.
    } else {
     console.warn('Persistence could not be enabled:', err.message);
    }
  });
}


export default app;

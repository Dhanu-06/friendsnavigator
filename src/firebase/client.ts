// src/firebase/client.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence
} from 'firebase/firestore';

// Replace these with your real values if not using emulator
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'fake-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'localhost',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'friendsnavigator-dev',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'friendsnavigator-dev.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// exports
export const auth = getAuth(app);
export const db = getFirestore(app);

// connect to emulators if flag true
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  try {
    // Auth emulator at 9099, Firestore emulator at 8080
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('Connected Firebase client to local emulators');
  } catch (e) {
    console.warn('Failed to connect to emulators', e);
  }
}

// optional: enable persistence local dev - safe with emulator
try {
    enableIndexedDbPersistence(db).catch((err: any) => {
        // ignore in emulator if not available
        if (String(err).includes('multiple-tabs')) {
            // This is a normal error when multiple tabs are open
        } else {
            console.warn('IndexedDB persistence not enabled:', err?.message ?? err);
        }
    });
} catch(err: any) {
        console.warn('IndexedDB persistence not available:', err?.message ?? err);
}


export default app;

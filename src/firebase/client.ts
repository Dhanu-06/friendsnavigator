// src/firebase/client.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

// <-- REPLACE with your actual web config if you use cloud later.
// For emulator dev we only need a dummy config.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'fake',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'localhost',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'friendsnavigator-dev',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'friendsnavigator-dev.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Auth
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

// If running with emulator flag, connect to local emulators
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  console.log('Connecting to Firebase emulators');
  // Auth emulator
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

  // Firestore emulator
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
} else {
    console.log('Connecting to production Firebase');
}

// Optional: enable offline persistence for better local behaviour
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

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

console.log('FIREBASE ENV:', {
  USE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
  API_KEY_PRESENT: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  TOMTOM_KEY_PRESENT: !!process.env.NEXT_PUBLIC_TOMTOM_API_KEY
});

if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  try {
    console.log('Connecting to Firebase emulators (auth:9099, firestore:8080)');
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // @ts-ignore
    db.settings && db.settings({ experimentalForceLongPolling: true });
    console.log('Connected to Firebase emulators');
  } catch (e) {
    console.warn('Emulator connection failed', e);
  }
} else {
  console.log('Using cloud Firebase config');
}

enableIndexedDbPersistence(db).catch((e) => {
  if (String(e).includes('multiple-tabs')) return;
  console.warn('Persistence not enabled:', e?.message ?? e);
});

export default app;

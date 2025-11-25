'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const firestore = initializeFirestore(app, {});

  // This check MUST be inside the initialize function and should only be 'true'
  if (process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === 'true') {
      // It's safe to call this multiple times. It only connects once.
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  }

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: firestore,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
// This file is not used
// export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

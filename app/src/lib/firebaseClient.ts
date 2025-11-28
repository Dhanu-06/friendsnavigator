
// src/lib/firebaseClient.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

let firebaseApp: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let isInitialized = false;

export function getFirebaseInstances() {
  if (isInitialized && firebaseApp && authInstance) {
    return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApps()[0];
  }

  authInstance = getAuth(firebaseApp);

  // Initialize Firestore separately to attach emulator if needed
  // This check avoids re-initializing firestore if it's already configured.
  try {
      firestoreInstance = getFirestore(firebaseApp);
  } catch (e) {
      firestoreInstance = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
      });
  }
  
  const useEmu = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

  if (useEmu) {
    const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost';
    const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
    const authPort = parseInt(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || '9099', 10);

    // @ts-ignore - _settings is not a public property but it's a reliable way to check
    if (firestoreInstance && !firestoreInstance._settings.host.includes(host)) {
      try {
        connectFirestoreEmulator(firestoreInstance, host, firestorePort);
        console.log(`Firestore emulator connected to ${host}:${firestorePort}`);
      } catch (e) {
        console.warn("Firestore emulator connection failed (safe to ignore if already connected):", e);
      }
    }

    // @ts-ignore - emulatorConfig is not in the type def
    if (authInstance && !authInstance.emulatorConfig) {
       try {
        connectAuthEmulator(authInstance, `http://${host}:${authPort}`);
        console.log(`Auth emulator connected to http://${host}:${authPort}`);
       } catch (e) {
        console.warn("Auth emulator connection failed (safe to ignore if already connected):", e);
       }
    }
  }


  isInitialized = true;
  return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
}

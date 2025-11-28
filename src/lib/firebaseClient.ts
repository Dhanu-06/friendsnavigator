
/**
 * Auto-generated firebase client init by fix-firebase.sh
 * SAFE: uses getApps() guard to prevent duplicate initialization (HMR safe)
 * NOTE: Do not commit production secrets here. Use .env.local for keys.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "dummy-key") {
  console.warn("⚠️ Firebase API key is missing or dummy. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in .env or .env.local");
}

let firebaseApp: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let isInitialized = false;

export function getFirebaseInstances() {
  if (isInitialized && firebaseApp && authInstance) {
    return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
  }

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  authInstance = getAuth(firebaseApp);
  
  try {
      firestoreInstance = getFirestore(firebaseApp);
  } catch (e) {
      firestoreInstance = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
      });
  }
  
  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

  if (useEmulator) {
    const host = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';
    const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
    const authPort = parseInt(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || '9099', 10);
    
    // @ts-ignore - _settings is a private but reliable way to check connection
    if (firestoreInstance && !firestoreInstance._settings.host.includes(host)) {
        try {
            connectFirestoreEmulator(firestoreInstance, host, firestorePort);
            console.info(`Firestore emulator connected to ${host}:${firestorePort}`);
        } catch (e) {
            console.warn(`Firestore emulator connection failed (safe to ignore if already connected):`, e);
        }
    }

    // @ts-ignore - emulatorConfig is not in type def
    if (authInstance && !authInstance.emulatorConfig) {
       try {
        const authUrl = `http://${host}:${authPort}`;
        connectAuthEmulator(authInstance, authUrl);
        console.info(`Auth emulator connected to ${authUrl}`);
       } catch (e) {
        console.warn(`Auth emulator connection failed (safe to ignore if already connected):`, e);
       }
    }
  } else {
    console.info("🌐 Using production Firebase services. Ensure .env contains NEXT_PUBLIC_FIREBASE_* values.");
  }

  isInitialized = true;
  return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
}


// AUTO-PATCHED firebaseClient.ts
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

// Quick safe probe to detect emulator reachability
async function isEmulatorReachable(host: string, port: string) {
  try {
    // In the browser, we can't reliably ping a port without making a network request.
    // We'll rely on the SDK's own connection attempts and handle errors gracefully.
    // The logic in getFirebaseInstances will now handle this.
    // For server-side checks, a different strategy would be needed.
    return true; // Assume reachable and let the connection attempt prove otherwise.
  } catch {
    return false;
  }
}

export function getFirebaseInstances() {
  // Return cached instances if already initialized
  if (isInitialized && firebaseApp && firestoreInstance && authInstance) {
    return { app: firebaseApp, firestore: firestoreInstance, auth: authInstance };
  }

  // Base config (required even for emulator)
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

  // Initialize Firestore with stable settings
  try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
        // @ts-ignore
        experimentalForceLongPolling: true,
      });
  } catch (e) {
      firestoreInstance = getFirestore(firebaseApp);
  }


  authInstance = getAuth(firebaseApp);

  const useEmu = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
  const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8080";
  const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || host;
  const authPort = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || "9099";

  if (useEmu) {
      console.log("Attempting to connect to emulators...");
      try {
        // @ts-ignore
        if (!firestoreInstance._settings.host) {
            connectFirestoreEmulator(firestoreInstance, host, Number(port));
            console.log(`Firestore emulator connected to ${host}:${port}`);
        }
      } catch (e) {
        console.warn("Firestore emulator connect failed (safe):", e);
      }

      try {
         // @ts-ignore
        if (!authInstance.emulatorConfig) {
            connectAuthEmulator(authInstance, `http://${authHost}:${authPort}`, {
                disableWarnings: true,
            });
            console.log(`Auth emulator connected to http://${authHost}:${authPort}`);
        }
      } catch (e) {
        console.warn("Auth emulator connect failed (safe):", e);
      }
  }

  isInitialized = true;
  return { app: firebaseApp, firestore: firestoreInstance, auth: authInstance };
}

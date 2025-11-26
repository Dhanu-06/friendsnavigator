// lib/firebaseClient.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function is memoized so it only runs once.
const initializeFirebase = (() => {
  let app: FirebaseApp;
  let auth: Auth;
  let firestore: Firestore;
  let initialized = false;

  return () => {
    if (initialized) {
      return { app, auth, firestore };
    }

    if (getApps().length > 0) {
        app = getApp();
    } else {
        app = initializeApp(firebaseConfig);
    }

    auth = getAuth(app);
    
    // Firestore can be initialized with settings to force long-polling.
    try {
        // @ts-ignore
        firestore = initializeFirestore(app, { experimentalForceLongPolling: true });
    } catch (e) {
        // If initializeFirestore is not available (older SDK versions) or fails, fallback to getFirestore.
        firestore = getFirestore(app);
        console.warn("initializeFirestore with settings failed, falling back to getFirestore().", e);
    }

    const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

    if (useEmulator) {
        const FIRESTORE_HOST = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "localhost";
        const FIRESTORE_PORT = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || 8080);
        const AUTH_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost";
        const AUTH_PORT = Number(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || 9099);

        // Check if emulators are already connected to avoid re-connecting on hot reloads
        // @ts-ignore
        if (!auth.emulatorConfig) {
            try {
                console.log("[FirebaseClient] Connecting Auth emulator:", `http://${AUTH_HOST}:${AUTH_PORT}`);
                connectAuthEmulator(auth, `http://${AUTH_HOST}:${AUTH_PORT}`, { disableWarnings: true });
            } catch (e) {
                console.error("[FirebaseClient] Auth emulator connect failed:", e);
            }
        }

        // @ts-ignore
        if (!firestore.emulator) {
            try {
                console.log("[FirebaseClient] Connecting Firestore emulator:", FIRESTORE_HOST, FIRESTORE_PORT);
                connectFirestoreEmulator(firestore, FIRESTORE_HOST, FIRESTORE_PORT);
                 console.log("[FirebaseClient] Set experimentalForceLongPolling = true");
            } catch (e) {
                console.error("[FirebaseClient] Firestore emulator connect failed:", e);
            }
        }
    }
    
    initialized = true;
    return { app, auth, firestore };
  };
})();


// Export a function that returns the memoized instances.
export const getFirebaseInstances = () => initializeFirebase();

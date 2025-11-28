// src/lib/firebaseClient.ts
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

// Log only presence (do not leak secrets)
if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn("⚠️ NEXT_PUBLIC_FIREBASE_API_KEY is missing. Add real keys to .env or .env.local");
}

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
let firestore: Firestore;

try {
    firestore = getFirestore(app);
} catch (e) {
    firestore = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
}


// Emulator will be used only when NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true".
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    console.info("[firebaseClient] Using Firebase Emulators");
    
    const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    if (authHost) {
        const url = authHost.startsWith("http") ? authHost : `http://${authHost}`;
        try {
            console.info("[firebaseClient] connecting to auth emulator at", url);
            connectAuthEmulator(auth, url);
        } catch (err) {
            console.error("[firebaseClient] connectAuthEmulator failed:", err);
        }
    }

    const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
    const firestorePort = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT;
    if (firestoreHost && firestorePort) {
        try {
            console.info(`[firebaseClient] connecting to firestore emulator at ${firestoreHost}:${firestorePort}`);
            connectFirestoreEmulator(firestore, firestoreHost, parseInt(firestorePort));
        } catch (err) {
             console.error("[firebaseClient] connectFirestoreEmulator failed:", err);
        }
    }

} else {
  // eslint-disable-next-line no-console
  console.info("[firebaseClient] using real Firebase endpoints");
}


export const getFirebaseInstances = () => {
    return { app, auth, firestore };
}

export default app;

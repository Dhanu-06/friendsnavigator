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

// Friendly dev-time message if missing key
if (!firebaseConfig.apiKey && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn("⚠️ NEXT_PUBLIC_FIREBASE_API_KEY is missing. Add your Firebase web config to .env.local");
}

let app: FirebaseApp;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

function initializeFirebase() {
    if (getApps().length) {
        app = getApps()[0];
    } else {
        app = initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
    
    try {
        firestore = getFirestore(app);
    } catch (e) {
        firestore = initializeFirestore(app, {
          ignoreUndefinedProperties: true,
        });
    }

    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
        const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
        const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
        const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
        const authUrl = authHost.startsWith("http") ? authHost : `http://${authHost}`;

        try {
            // @ts-ignore - _settings is not a public property but it's a reliable way to check
            if (firestore && !firestore._settings.host.includes(firestoreHost)) {
                console.info(`[firebaseClient] connecting to firestore emulator at ${firestoreHost}:${firestorePort}`);
                connectFirestoreEmulator(firestore, firestoreHost, firestorePort);
            }
        } catch (err) {
             console.warn("[firebaseClient] connectFirestoreEmulator failed (safe to ignore if already connected):", err);
        }

        try {
            // @ts-ignore - emulatorConfig is not in the type def
            if (auth && !auth.emulatorConfig) {
                 console.info("[firebaseClient] connecting to auth emulator at", authUrl);
                 connectAuthEmulator(auth, authUrl);
            }
        } catch (err) {
            console.warn("[firebaseClient] connectAuthEmulator failed (safe to ignore if already connected):", err);
        }
    } else {
      console.info("[firebaseClient] using real Firebase endpoints");
    }
}


export const getFirebaseInstances = () => {
    if (typeof window !== "undefined" && !getApps().length) {
        initializeFirebase();
    }
    // For server-side rendering, we need to ensure initialization happens.
    // However, for client-side, this will be handled by the initial check.
    // This logic ensures we don't re-initialize unnecessarily.
    if (!app) {
       initializeFirebase();
    }

    return { app, auth, firestore };
}

// src/lib/firebaseClient.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Dev-time hint if missing
if (!firebaseConfig.apiKey && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn("⚠️ NEXT_PUBLIC_FIREBASE_API_KEY is missing in .env.local");
}

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);

try {
    firestore = getFirestore(app);
} catch (e) {
    firestore = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
}


// Only connect to emulator when explicitly requested.
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  console.info("[firebaseClient] Using Firebase Emulators");

  const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost';
  const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
  const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  const authUrl = authHost.startsWith("http") ? authHost : `http://${authHost}`;
  
  try {
      // @ts-ignore - _settings is not a public property but it's a reliable way to check
      if (firestore && !firestore._settings.host.includes(firestoreHost)) {
          connectFirestoreEmulator(firestore, firestoreHost, firestorePort);
          console.info(`[firebaseClient] Firestore emulator connected to ${firestoreHost}:${firestorePort}`);
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
  // eslint-disable-next-line no-console
  console.info("[firebaseClient] using real Firebase endpoints");
}


export const getFirebaseInstances = () => {
    return { app, auth, firestore };
}

// Optional: initialize analytics only in the browser and only if measurementId is present.
// Keep this import dynamic to avoid SSR errors.
export async function initAnalyticsIfNeeded() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.measurementId) return null;

  try {
    const { getAnalytics } = await import("firebase/analytics");
    return getAnalytics(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Analytics not initialized:", err);
    return null;
  }
}

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

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;


function initializeFirebase() {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }

    auth = getAuth(app);
    
    try {
        firestore = getFirestore(app);
    } catch (e) {
        // @ts-ignore
        firestore = initializeFirestore(app, { experimentalForceLongPolling: true });
    }

    const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

    if (useEmulator) {
        const FIRESTORE_HOST = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "localhost";
        const FIRESTORE_PORT = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || 8080);
        const AUTH_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost";
        const AUTH_PORT = Number(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || 9099);

        try {
            console.log("Connecting Auth emulator:", `http://${AUTH_HOST}:${AUTH_PORT}`);
            connectAuthEmulator(auth, `http://${AUTH_HOST}:${AUTH_PORT}`, { disableWarnings: true });
        } catch (e) {
            console.error("Auth emulator connect failed:", e);
        }

        try {
            console.log("Connecting Firestore emulator:", FIRESTORE_HOST, FIRESTORE_PORT);
            connectFirestoreEmulator(firestore, FIRESTORE_HOST, FIRESTORE_PORT);
             try {
                // @ts-ignore
                firestore.settings?.({ experimentalForceLongPolling: true });
            } catch (ee) {
                console.warn("Could not set firestore settings for long polling:", ee);
            }
        } catch (e) {
            console.error("Firestore emulator connect failed:", e);
        }
    } else {
         try {
            // @ts-ignore
            firestore.settings?.({ experimentalForceLongPolling: true });
        } catch (e) {}
    }

    return { app, auth, firestore };
}

// Initialize and export singleton instances
const instances = initializeFirebase();
const getFirebaseInstances = () => instances;

export { getFirebaseInstances };

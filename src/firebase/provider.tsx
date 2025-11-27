
// src/firebase/provider.tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import { getFirebaseInstances } from "@/lib/firebaseClient";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import TempEmuCheck from "@/components/TempEmuCheck";


type FirebaseContextType = {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
};

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  // The value is provided by the FirebaseClientProvider, which memoizes it.
  const memoizedValue = useMemo(() => {
    try {
      const { app, auth, firestore } = getFirebaseInstances();
      return { app, auth, firestore };
    } catch (e) {
      console.error("Firebase initialization failed in provider", e);
      return { app: null, auth: null, firestore: null };
    }
  }, []);

  return (
    <FirebaseContext.Provider value={memoizedValue}>
      {children}
      <FirebaseErrorListener />
      <TempEmuCheck />
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}

export const useFirebaseApp = () => useFirebase()?.app;
export const useAuth = () => useFirebase()?.auth;
export const useFirestore = () => useFirebase()?.firestore;

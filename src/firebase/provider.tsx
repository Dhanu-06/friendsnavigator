// src/firebase/provider.tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import { getFirebaseInstances } from "@/lib/firebaseClient";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const FirebaseContext = createContext<{
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
} | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const instances = useMemo(() => {
    try {
      return getFirebaseInstances();
    } catch (e) {
      console.error("Firebase initialization failed in provider", e);
      return { app: null, auth: null, firestore: null };
    }
  }, []);

  return (
    <FirebaseContext.Provider value={instances}>
      {children}
      <FirebaseErrorListener />
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

export function useAuth(): Auth | null {
  return useFirebase()?.auth ?? null;
}

export const useFirebaseApp = () => useFirebase()?.app;
export const useFirestore = () => useFirebase()?.firestore;

// src/firebase/provider.tsx
"use client";

import React, { createContext, useContext } from "react";
import { getFirebaseInstances } from "@/lib/firebaseClient";
import type { Auth } from "firebase/auth";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";

const AuthContext = createContext<Auth | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  // The auth object is ready as soon as firebaseClient is imported.
  // We get it from our single, reliable source.
  const { auth } = getFirebaseInstances();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
      <FirebaseErrorListener />
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth | null {
  return useContext(AuthContext);
}

'use client';

import { useMemo } from 'react';
import { initializeFirebase, FirebaseProvider } from '@/firebase';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // The value returned by initializeFirebase() is memoized.
  const firebaseValue = useMemo(() => {
    // initializeFirebase() will be called only once.
    const { app, auth, firestore } = initializeFirebase();
    return { app, auth, firestore };
  }, []);

  // The value passed to the provider is stable.
  return <FirebaseProvider value={firebaseValue}>{children}</FirebaseProvider>;
}

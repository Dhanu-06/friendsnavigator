'use client';

import { useMemo } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { getFirebaseInstances } from '@/lib/firebaseClient';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // The value returned by getFirebaseInstances() is memoized.
  const firebaseValue = useMemo(() => {
    // getFirebaseInstances() will be called only once.
    const { app, auth, firestore } = getFirebaseInstances();
    return { app, auth, firestore };
  }, []);

  // The value passed to the provider is stable.
  return <FirebaseProvider value={firebaseValue}>{children}</FirebaseProvider>;
}

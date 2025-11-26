'use client';

import { FirebaseProvider } from '@/firebase/provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // The FirebaseProvider is now self-contained and will handle instance creation.
  return <FirebaseProvider>{children}</FirebaseProvider>;
}

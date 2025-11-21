'use client';

import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth]);

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  );
}

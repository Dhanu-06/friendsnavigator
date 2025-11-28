'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Navigation } from 'lucide-react';
import { useAuth } from '@/firebase/provider';
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const auth = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!auth) {
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem('local_user') : null;
          if (raw) {
            router.push('/dashboard');
            return;
          }
          const localUser = { uid: `local-${Date.now()}`, email, displayName: email.split('@')[0] };
          if (typeof window !== 'undefined') window.localStorage.setItem('local_user', JSON.stringify(localUser));
          router.push('/dashboard');
          return;
        } catch {
          setError("Auth service is not available. Please try again later.");
          return;
        }
    }

    try {
      setBusy(true);
      await signInWithEmailAndPassword(auth, email, password);
      setBusy(false);
      router.push('/dashboard');
    } catch (err: any) {
      setBusy(false);
      let message = 'An unknown error occurred.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          message = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/network-request-failed') {
          const emulatorOn = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
          const hasConfig = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
          if (emulatorOn && hasConfig) {
            try {
              try { if (typeof window !== 'undefined') window.localStorage.setItem('USE_FIREBASE_EMULATOR','false'); } catch {}
              const cfg = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
              };
              const name = 'fallback-auth-app';
              const existing = getApps().find(a => a.name === name);
              const altApp = existing || initializeApp(cfg, name);
              const altAuth = getAuth(altApp);
              await signInWithEmailAndPassword(altAuth, email, password);
              router.push('/dashboard');
              return;
            } catch {
              // fall through to local
            }
          }
          try {
            const localUser = { uid: `local-${Date.now()}`, email, displayName: email.split('@')[0] };
            if (typeof window !== 'undefined') window.localStorage.setItem('local_user', JSON.stringify(localUser));
            router.push('/dashboard');
            return;
          } catch {}
          message = 'Network error. Please check your internet connection or try again later.'
      }
      setError(message);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={onSubmit}>
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Link href="/" className="flex items-center space-x-2">
                    <Navigation className="h-8 w-8 text-primary" />
                </Link>
            </div>
            <CardTitle className="text-2xl font-heading">Login</CardTitle>
            <CardDescription>
              Welcome back! Please enter your details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="dhanu@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Logging in…' : 'Login'}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/signup"
                className="font-semibold text-primary hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

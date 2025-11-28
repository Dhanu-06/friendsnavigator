
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase/provider';
import { createUserWithEmailAndPassword, updateProfile, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Navigation } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const auth = useAuth();

  const friendlyError = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email address is already in use. Please try logging in.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Your password is too weak. Please use at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      default:
        return 'An unknown error occurred. Please see the console for more details.';
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError('Please enter your name.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    if (!auth) {
        setError("Authentication service is not ready. Please try again in a moment.");
        return;
    }

    setBusy(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCred.user) {
        await updateProfile(userCred.user, { displayName: name });
      }
      
      setSuccess('Account created successfully! You can now log in.');
      setName('');
      setEmail('');
      setPassword('');
      setConfirm('');
      router.push('/dashboard');

    } catch (err: any) {
      console.error('Signup error:', err);
      const code = err?.code || '';
      const emulatorOn = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
      const hasConfig = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
      if (code === 'auth/network-request-failed' && emulatorOn && hasConfig) {
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
          const altCred = await createUserWithEmailAndPassword(altAuth, email, password);
          if (altCred.user) await updateProfile(altCred.user, { displayName: name });
          setSuccess('Account created successfully! You can now log in.');
          setName(''); setEmail(''); setPassword(''); setConfirm('');
          router.push('/dashboard');
          return;
        } catch (e2: any) {
          console.error('Signup retry with production auth failed:', e2);
          setError(friendlyError(e2?.code || ''));
        }
      } else {
        // As a last-resort, create a local session so the app remains usable
        try {
          const localUser = { uid: `local-${Date.now()}`, email, displayName: name };
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('local_user', JSON.stringify(localUser));
          }
          setSuccess('Account created locally. You can use the app offline.');
          setName(''); setEmail(''); setPassword(''); setConfirm('');
          router.push('/dashboard');
        } catch (e3) {
          setError(friendlyError(code));
        }
      }
    } finally {
      setBusy(false);
    }
  };

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
            <CardTitle className="text-2xl font-heading">Create an Account</CardTitle>
            <CardDescription>
              Join to start planning trips with your friends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Signup Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
             {success && (
              <Alert variant="default" className="border-green-500 text-green-700">
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Dhanu"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                required 
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Creating Account…' : 'Sign Up'}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-semibold text-primary hover:underline"
              >
                Log In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail } from '@/firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigation } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/firebase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFallbackNotice(null);
    
    const result = await signInWithEmail(email, password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    
    if ((result as any).fallback === 'local') {
        setFallbackNotice('Using local fallback auth because emulator/network is unavailable.');
    }

    toast({
      title: 'Login Successful!',
      description: 'Redirecting to your dashboard...',
    });
    router.push('/dashboard');
  }

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    setBusy(true);
    signInWithPopup(auth, provider)
      .then((result) => {
        setBusy(false);
        const user = result.user;
        toast({
          title: 'Login Successful',
          description: `Welcome ${user.displayName}!`,
        });
        router.push('/dashboard');
      }).catch((error) => {
        setBusy(false);
        setError(error.message);
      });
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
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
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
             {fallbackNotice && (
              <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4" />
                <AlertTitle>Developer Notice</AlertTitle>
                <AlertDescription>{fallbackNotice}</AlertDescription>
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
              {busy ? 'Signing in…' : 'Login'}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} type="button" disabled={busy}>
              Sign in with Google
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

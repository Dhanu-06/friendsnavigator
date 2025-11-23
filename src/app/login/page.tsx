'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const createUserProfile = (userCred: UserCredential, displayName: string) => {
    if (!firestore) return;
    // Use the user's UID as the document ID.
    const userRef = doc(firestore, 'users', userCred.user.uid);
    const userData = {
      id: userCred.user.uid,
      name: displayName || userCred.user.displayName || 'Anonymous',
      email: userCred.user.email,
      avatarUrl: userCred.user.photoURL || `https://picsum.photos/seed/${userCred.user.uid}/40/40`,
    };
    // Use the non-blocking helper to create the user document.
    setDocumentNonBlocking(userRef, userData, { merge: true });
  }

  const handleAuthSuccess = (userCred: UserCredential, displayName?: string) => {
    createUserProfile(userCred, displayName || '');
    // Let the useEffect handle redirection
  };

  const handleAuthError = (error: any) => {
    console.error("Authentication error:", error);
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description: error.message || 'An unexpected error occurred.',
    });
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsSigningIn(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      handleAuthSuccess(userCred, name);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsSigningIn(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      handleAuthSuccess(userCred);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsSigningIn(false);
    }
  };
  
  if (isUserLoading || user) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8">
            <Logo/>
        </div>
      <Tabs defaultValue="signin" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Welcome back! Sign in to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSignIn}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signin">Email</Label>
                    <Input id="email-signin" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signin">Password</Label>
                    <Input id="password-signin" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningIn}>
                    {isSigningIn ? 'Signing In...' : 'Sign In'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create an account to start navigating with friends.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSignUp}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-signup">Name</Label>
                    <Input id="name-signup" type="text" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input id="email-signup" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>                    
                    <Input id="password-signup" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningIn}>
                    {isSigningIn ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

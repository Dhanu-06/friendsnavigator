'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail } from '@/firebase/auth';
import { createUserDoc } from '@/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Navigation } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast({
        variant: "destructive",
        title: 'Signup Failed',
        description: 'Passwords do not match.',
      });
      return;
    }
    setBusy(true);
    setFallbackNotice(null);
    const result = await signUpWithEmail(name, email, password);
    
    if (result.error) {
      setBusy(false);
      toast({
        variant: "destructive",
        title: 'Signup Failed',
        description: result.error,
      });
      return;
    }
    
    if ((result as any).fallback === 'local') {
      setFallbackNotice('Using local fallback signup because emulator/network is unavailable.');
    } else if (result.user) {
      // Only create firestore doc if it was a real signup
      await createUserDoc(result.user);
    }
    
    setBusy(false);
    toast({
        title: 'Account Created!',
        description: 'Redirecting to your dashboard...',
    });
    router.push('/dashboard');
  }

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
            <CardTitle className="text-2xl font-heading">Create an Account</CardTitle>
            <CardDescription>
              Join FriendsNavigator X to start your next adventure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {fallbackNotice && (
              <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4" />
                <AlertTitle>Developer Notice</AlertTitle>
                <AlertDescription>{fallbackNotice}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Dhanushree" 
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
               {busy ? 'Signing up…' : 'Sign Up'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-semibold text-primary hover:underline"
              >
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

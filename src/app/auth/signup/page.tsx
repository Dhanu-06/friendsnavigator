
// src/app/auth/signup/page.tsx  (App Router)
"use client";

import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Navigation } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");         // controlled input
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const friendlyError = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "Email already in use. Try logging in.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/weak-password":
        return "Password too weak. Use at least 6 characters.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
      default:
        return "An unknown error occurred. See console for details.";
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError("Please enter your name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    if (!auth || !firestore) {
        setError("Services not ready. Please try again in a moment.");
        return;
    }

    setBusy(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCred.user) {
        // Set display name in Auth
        await updateProfile(userCred.user, { displayName: name });

        // Create user profile document in Firestore
        const userProfile = {
          id: userCred.user.uid,
          name: name,
          email: userCred.user.email,
          avatarUrl: userCred.user.photoURL || `https://i.pravatar.cc/150?u=${userCred.user.uid}`,
        };
        const userDocRef = doc(firestore, 'users', userCred.user.uid);
        
        // Asynchronously set the document. We don't want to block the UI flow for this.
        setDoc(userDocRef, userProfile, { merge: true }).catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userProfile,
          });
          errorEmitter.emit('permission-error', permissionError);
          // Log locally but don't block user flow
          console.error("Failed to create user profile in Firestore.", err);
        });
      }
      
      setSuccess("Account created! Redirecting to your dashboard...");
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error("Signup error:", err);
      const code = err?.code ?? (err?.message ? String(err.message) : "unknown");
      setError(friendlyError(code));
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
              Join FriendsNavigator X to start your next adventure.
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
                placeholder="Dhanushree" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
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
                disabled={busy}
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
                disabled={busy}
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
                disabled={busy}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={busy}>
               {busy ? 'Creating account…' : 'Sign Up'}
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

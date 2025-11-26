// src/firebase/auth.ts
import { auth } from './client';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User
} from 'firebase/auth';

export async function signUpWithEmail(name: string, email: string, password: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // set display name
    if (name && cred.user) {
      await updateProfile(cred.user as User, { displayName: name });
    }
    return { user: cred.user, error: null };
  } catch (err: any) {
    console.error('signUp error', err);
    if (err.code === 'auth/network-request-failed') {
      return { user: null, error: 'Network error. Please check your connection or ensure the Firebase emulator is running.' };
    }
    return { user: null, error: (err?.message ?? String(err)) };
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { user: cred.user, error: null };
  } catch (err: any) {
    console.error('signIn error', err);
    if (err.code === 'auth/network-request-failed') {
      return { user: null, error: 'Network error: Could not connect to authentication service. If you are developing locally, please ensure the Firebase emulator is running (`npm run emulators`).' };
    }
    return { user: null, error: (err?.message ?? String(err)) };
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { ok: true };
  } catch (err: any) {
    console.error('signOut error', err);
    return { ok: false, error: (err?.message ?? String(err)) };
  }
}


// src/firebase/auth.ts
import { auth } from './client';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User
} from 'firebase/auth';
import { fakeSignIn, fakeSignOut, fakeSignUp, getFakeCurrentUser } from './fakeAuth';

function isNetworkError(err: any) {
  const code = err?.code ?? '';
  return code.includes('network-request-failed') || code.includes('auth/network-request-failed') || code.includes('unavailable');
}

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
    if (isNetworkError(err)) {
       console.warn('Falling back to fake local signup due to network error.');
       try {
        const { user } = await fakeSignUp(name, email, password);
        return { user, error: null, fallback: 'local' };
      } catch (ferr: any) {
        return { user: null, error: ferr?.message ?? String(ferr) };
      }
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
     if (isNetworkError(err)) {
      console.warn('Falling back to fake local auth due to network error.');
      try {
        const { user } = await fakeSignIn(email, password);
        return { user, error: null, fallback: 'local' };
      } catch (ferr: any) {
        return { user: null, error: ferr?.message ?? String(ferr) };
      }
    }
     if (err.code === 'auth/wrong-password' || err.code === 'wrong-password') {
      return { user: null, error: 'Incorrect password. Please try again.' };
    }
    if (err.code === 'auth/user-not-found' || err.code === 'user-not-found') {
      return { user: null, error: 'User not found. Please sign up first.' };
    }
    return { user: null, error: (err?.message ?? String(err)) };
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { ok: true };
  } catch (err: any)
   {
    if (isNetworkError(err)) {
        console.warn('signOut network error, using fakeSignOut', err);
        await fakeSignOut();
        return { ok: true, fallback: 'local' };
    }
    console.error('signOut error', err);
    return { ok: false, error: (err?.message ?? String(err)) };
  }
}

export function getCurrentLocalUser() {
  return getFakeCurrentUser();
}

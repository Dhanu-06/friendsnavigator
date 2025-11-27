// src/lib/localAuth.ts
// This file is deprecated and should not be used.
// The application now uses real Firebase Authentication.
// See /src/app/auth/login/page.tsx and /src/app/auth/signup/page.tsx for the new implementation.

export type LocalUser = {
  uid: string;
  name: string;
  email: string;
};

const STORAGE_KEY = 'friendsnavigator_current_user';

export function getCurrentUser(): LocalUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalUser;
  } catch {
    return null;
  }
}

export function signUpLocal(name: string, email: string, password: string) {
  // NOTE: password is not stored securely; this is only for demo/dev.
  const uid = 'local_' + Math.random().toString(36).slice(2, 10);
  const user: LocalUser = { uid, name, email };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return Promise.resolve(user);
}

export function signInLocal(email: string, password: string) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return Promise.reject(
      new Error('No local account found. Please sign up.')
    );
  }
  try {
    const user = JSON.parse(raw) as LocalUser;
    if (user.email !== email) {
      return Promise.reject(
        new Error('Email does not match saved account.')
      );
    }
    return Promise.resolve(user);
  } catch {
    return Promise.reject(new Error('Corrupted local auth data.'));
  }
}

export function signOutLocal() {
  localStorage.removeItem(STORAGE_KEY);
  return Promise.resolve();
}

// src/lib/localAuth.ts

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
  // In real app, use Firebase Auth or another auth provider.
  const uid = 'local_' + Math.random().toString(36).slice(2, 10);
  const user: LocalUser = { uid, name, email };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return Promise.resolve(user);
}

export function signInLocal(email: string, password: string) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return Promise.reject(
      new Error('No local account found on this browser. Please sign up first.')
    );
  }
  try {
    const user = JSON.parse(raw) as LocalUser;
    if (user.email !== email) {
      return Promise.reject(
        new Error('Email does not match saved account. Please sign up again.')
      );
    }
    return Promise.resolve(user);
  } catch {
    return Promise.reject(new Error('Corrupted local auth data. Clear storage and retry.'));
  }
}

export function signOutLocal() {
  localStorage.removeItem(STORAGE_KEY);
  return Promise.resolve();
}

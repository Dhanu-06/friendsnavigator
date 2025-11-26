// src/firebase/fakeAuth.ts
export type FakeUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
};

const STORAGE_KEY = 'fnx_fake_auth_user';

export function fakeSignUp(name: string, email: string, password: string) {
  // very simple fake sign up - no password checks
  const uid = 'local_' + Math.random().toString(36).slice(2, 9);
  const user: FakeUser = { uid, displayName: name || null, email: email || null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return Promise.resolve({ user });
}

export function fakeSignIn(email: string, password: string) {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return Promise.reject(new Error('No local user found. Please sign up.'));
  }
  try {
    const user = JSON.parse(stored) as FakeUser;
    if (email && user.email !== email) {
      return Promise.reject(new Error('Email does not match local account. Please sign up.'));
    }
    return Promise.resolve({ user });
  } catch (e) {
    return Promise.reject(new Error('Failed to read local auth.'));
  }
}

export function fakeSignOut() {
  localStorage.removeItem(STORAGE_KEY);
  return Promise.resolve();
}

export function getFakeCurrentUser(): FakeUser | null {
  const s = localStorage.getItem(STORAGE_KEY);
  if (!s) return null;
  try {
    return JSON.parse(s) as FakeUser;
  } catch {
    return null;
  }
}

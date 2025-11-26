import { db } from '@/firebase/client';
import { doc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export async function createUserDoc(user: User) {
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  try {
    await setDoc(ref, {
        displayName: user.displayName || null,
        email: user.email || null,
        avatarUrl: user.photoURL || null,
        createdAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
      console.error("Error creating user document:", err);
  }
}

'use client';
import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useAuth } from '../provider';

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('local_user') : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          const localUser: any = {
            uid: parsed.uid || `local-${Date.now()}`,
            email: parsed.email || null,
            displayName: parsed.displayName || parsed.name || 'Local User',
            photoURL: parsed.photoURL || null,
          };
          setUser(localUser as User);
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth]);

  return { user, loading };
}

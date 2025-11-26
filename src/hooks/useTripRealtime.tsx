// src/hooks/useTripRealtime.tsx
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getFirebaseInstances } from '@/lib/firebaseClient';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { getTripById, saveTrip as saveTripLocal, type Trip } from '@/lib/tripStore';

export type Participant = {
  id: string;
  name: string;
  avatarUrl?: string;
  lat?: number;
  lng?: number;
  mode?: string;
  etaMinutes?: number;
  status?: string;
  coords?: { lat: number; lon: number };
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
// Get the firestore instance from the single source of truth.
const { firestore } = getFirebaseInstances();


export default function useTripRealtime(tripId?: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const participantsUnsub = useRef<(() => void) | null>(null);
  const messagesUnsub = useRef<(() => void) | null>(null);
  const expensesUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tripId) return;

    // The getFirebaseInstances() function now handles the emulator connection logic.
    // If not using emulator, or if firestore is unavailable, we rely on local storage.
    if (!useEmulator || !firestore) {
        if (typeof window !== 'undefined') {
          console.warn('Realtime hook: Firestore unavailable or emulator disabled. Using local fallback for all data.');
          const t = getTripById(tripId);
          if (t) {
              setParticipants(t.participants ?? []);
              setMessages(t.messages ?? []);
              setExpenses(t.expenses ?? []);
          }
        }
        return;
    }


    // Try setting up Firestore listeners
    try {
      const db = firestore as Firestore;
      const pCol = collection(db, 'trips', tripId, 'participants');
      participantsUnsub.current = onSnapshot(pCol, (snap) => {
        const arr: Participant[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
        setParticipants(arr);
      }, (err) => {
          console.error("Participants snapshot error, falling back to local.", err);
          const t = getTripById(tripId);
          if (t) setParticipants(t.participants ?? []);
      });

      const mCol = query(collection(db, 'trips', tripId, 'messages'), orderBy('createdAt', 'asc'));
      messagesUnsub.current = onSnapshot(mCol, (snap) => {
        const arr: any[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
        setMessages(arr);
      }, (err) => {
          console.error("Messages snapshot error, falling back to local.", err);
          const t = getTripById(tripId);
          if (t) setMessages(t.messages ?? []);
      });

      const eCol = collection(db, 'trips', tripId, 'expenses');
      expensesUnsub.current = onSnapshot(eCol, (snap) => {
        const arr: any[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
        setExpenses(arr);
      }, (err) => {
          console.error("Expenses snapshot error, falling back to local.", err);
          const t = getTripById(tripId);
          if (t) setExpenses(t.expenses ?? []);
      });

      return () => {
        if(participantsUnsub.current) participantsUnsub.current();
        if(messagesUnsub.current) messagesUnsub.current();
        if(expensesUnsub.current) expensesUnsub.current();
      };
    } catch (err) {
      // If Firestore unavailable, fall back to local trip data
      console.warn('Realtime hook: Firestore unavailable, using local fallback', err);
      const t = getTripById(tripId);
      if (t) {
        setParticipants(t.participants ?? []);
        setMessages(t.messages ?? []);
        setExpenses(t.expenses ?? []);
      }
    }
  }, [tripId]);

  const updateLocalTrip = useCallback((tripId: string, update: (trip: Trip) => Trip) => {
    const trip = getTripById(tripId);
    if (trip) {
      const updatedTrip = update(trip);
      saveTripLocal(updatedTrip);
      setParticipants([...(updatedTrip.participants ?? [])]);
      setMessages([...(updatedTrip.messages ?? [])]);
      setExpenses([...(updatedTrip.expenses ?? [])]);
    }
  }, []);

  // join or update a participant
  const joinOrUpdateParticipant = useCallback(async (tripIdStr: string, p: Participant) => {
    if (!useEmulator || !firestore) {
        updateLocalTrip(tripIdStr, (trip) => {
          const newParticipants = [...(trip.participants ?? [])];
          const idx = newParticipants.findIndex(x => x.id === p.id);
          if (idx >= 0) newParticipants[idx] = { ...newParticipants[idx], ...p };
          else newParticipants.push(p);
          trip.participants = newParticipants;
          return trip;
        });
        return { ok: true, source: 'local' };
    }
    try {
      await setDoc(doc(firestore as Firestore, 'trips', tripIdStr, 'participants', p.id), {
        ...p,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { ok: true, source: 'firestore' };
    } catch (err) {
      console.warn('joinOrUpdateParticipant failed, falling back to local', err);
      updateLocalTrip(tripIdStr, (trip) => {
        const newParticipants = [...(trip.participants ?? [])];
        const idx = newParticipants.findIndex(x => x.id === p.id);
        if (idx >= 0) newParticipants[idx] = { ...newParticipants[idx], ...p };
        else newParticipants.push(p);
        trip.participants = newParticipants;
        return trip;
      });
      return { ok: false, error: err, source: 'local' };
    }
  }, [updateLocalTrip]);

  const sendMessage = useCallback(async (tripIdStr: string, payload:{senderId:string, text:string, userName: string, avatarUrl: string}) => {
     if (!useEmulator || !firestore) {
        updateLocalTrip(tripIdStr, (trip) => {
          trip.messages = [...(trip.messages ?? []), { id: String(Date.now()), ...payload, createdAt: new Date().toISOString() }];
          return trip;
        });
        return { ok: true, source: 'local' };
    }
    try {
      await addDoc(collection(firestore as Firestore, 'trips', tripIdStr, 'messages'), {
        ...payload, createdAt: serverTimestamp()
      });
      return { ok: true, source: 'firestore' };
    } catch (err) {
      console.warn('sendMessage failed, falling back to local', err);
      updateLocalTrip(tripIdStr, (trip) => {
        trip.messages = [...(trip.messages ?? []), { id: String(Date.now()), ...payload, createdAt: new Date().toISOString() }];
        return trip;
      });
      return { ok:false, error:err, source: 'local' };
    }
  }, [updateLocalTrip]);

  const addExpense = useCallback(async (tripIdStr: string, payload:{paidBy:string,amount:number,label:string}) => {
     if (!useEmulator || !firestore) {
       updateLocalTrip(tripIdStr, (trip) => {
          trip.expenses = [...(trip.expenses ?? []), { id: String(Date.now()), ...payload }];
          return trip;
        });

       return { ok: true, source: 'local' };
    }
    try {
      await addDoc(collection(firestore as Firestore, 'trips', tripIdStr, 'expenses'), { ...payload, createdAt: serverTimestamp() });
      return { ok:true, source: 'firestore' };
    } catch (err) {
      console.warn('addExpense failed, falling back to local', err);
      updateLocalTrip(tripIdStr, (trip) => {
          trip.expenses = [...(trip.expenses ?? []), { id: String(Date.now()), ...payload }];
          return trip;
        });
      return { ok:false, error:err, source: 'local' };
    }
  }, [updateLocalTrip]);

  return {
    participants,
    messages,
    expenses,
    joinOrUpdateParticipant,
    sendMessage,
    addExpense,
  };
}

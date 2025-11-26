// src/hooks/useTripRealtime.tsx
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '@/firebase/client';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { getTripById, saveTrip as saveTripLocal, Trip } from '@/lib/tripStore';
import { getCurrentUser } from '@/lib/localAuth';

export type Participant = {
  id: string;
  name: string;
  avatarUrl?: string;
  lat?: number;
  lng?: number;
  mode?: string;
  etaMinutes?: number;
  status?: string;
};

export default function useTripRealtime(tripId?: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const participantsUnsub = useRef<(() => void) | null>(null);
  const messagesUnsub = useRef<(() => void) | null>(null);
  const expensesUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tripId) return;

    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
        console.warn('Realtime hook: Firestore emulator not enabled, using local fallback for all data.');
        const t = getTripById(tripId);
        if (t) {
            setParticipants(t.participants ?? []);
            setMessages(t.messages ?? []);
            setExpenses(t.expenses ?? []);
        }
        return;
    }

    // Try setting up Firestore listeners
    try {
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
      });

      const eCol = collection(db, 'trips', tripId, 'expenses');
      expensesUnsub.current = onSnapshot(eCol, (snap) => {
        const arr: any[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
        setExpenses(arr);
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
      }
    }
  }, [tripId]);

  const updateLocalTrip = (tripId: string, update: (trip: Trip) => Trip) => {
    const trip = getTripById(tripId);
    if (trip) {
      const updatedTrip = update(trip);
      saveTripLocal(updatedTrip);
      setParticipants([...(updatedTrip.participants ?? [])]);
      setMessages([...(updatedTrip.messages ?? [])]);
      setExpenses([...(updatedTrip.expenses ?? [])]);
    }
  };

  // join or update a participant
  const joinOrUpdateParticipant = useCallback(async (tripIdStr: string, p: Participant) => {
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
        updateLocalTrip(tripIdStr, (trip) => {
          const newParticipants = [...(trip.participants ?? [])];
          const idx = newParticipants.findIndex(x => x.id === p.id);
          if (idx >= 0) newParticipants[idx] = { ...newParticipants[idx], ...p };
          else newParticipants.push(p);
          trip.participants = newParticipants;
          return trip;
        });
        return { ok: false, error: new Error("Emulator not enabled") };
    }
    try {
      await setDoc(doc(db, 'trips', tripIdStr, 'participants', p.id), {
        ...p,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { ok: true };
    } catch (err) {
      console.warn('joinOrUpdateParticipant failed, local fallback', err);
      updateLocalTrip(tripIdStr, (trip) => {
        const newParticipants = [...(trip.participants ?? [])];
        const idx = newParticipants.findIndex(x => x.id === p.id);
        if (idx >= 0) newParticipants[idx] = { ...newParticipants[idx], ...p };
        else newParticipants.push(p);
        trip.participants = newParticipants;
        return trip;
      });
      return { ok: false, error: err };
    }
  }, []);

  const sendMessage = useCallback(async (tripIdStr: string, payload:{senderId:string, text:string, userName: string, avatarUrl: string}) => {
     if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
        updateLocalTrip(tripIdStr, (trip) => {
          trip.messages = [...(trip.messages ?? []), { id: String(Date.now()), ...payload, createdAt: new Date().toISOString() }];
          return trip;
        });
        return { ok: false, error: new Error("Emulator not enabled") };
    }
    try {
      await addDoc(collection(db, 'trips', tripIdStr, 'messages'), {
        ...payload, createdAt: serverTimestamp()
      });
      return { ok: true };
    } catch (err) {
      console.warn('sendMessage failed, local fallback', err);
      updateLocalTrip(tripIdStr, (trip) => {
        trip.messages = [...(trip.messages ?? []), { id: String(Date.now()), ...payload, createdAt: new Date().toISOString() }];
        return trip;
      });
      return { ok:false, error:err };
    }
  }, []);

  const addExpense = useCallback(async (tripIdStr: string, payload:{paidBy:string,amount:number,label:string}) => {
     if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
       updateLocalTrip(tripIdStr, (trip) => {
          trip.expenses = [...(trip.expenses ?? []), { id: String(Date.now()), ...payload }];
          return trip;
        });
       return { ok: false, error: new Error("Emulator not enabled") };
    }
    try {
      await addDoc(collection(db, 'trips', tripIdStr, 'expenses'), { ...payload, createdAt: serverTimestamp() });
      return { ok:true };
    } catch (err) {
      console.warn('addExpense failed, local fallback', err);
      updateLocalTrip(tripIdStr, (trip) => {
          trip.expenses = [...(trip.expenses ?? []), { id: String(Date.now()), ...payload }];
          return trip;
        });
      return { ok:false, error:err };
    }
  }, []);

  return {
    participants,
    messages,
    expenses,
    joinOrUpdateParticipant,
    sendMessage,
    addExpense,
  };
}

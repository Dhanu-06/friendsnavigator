
// src/hooks/useTripRealtime.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { getFirebaseInstances } from "@/lib/firebaseClient";
import { getTripLocal, saveTripLocal } from "@/lib/fallbackStore";
import type { Trip } from '@/lib/tripStore';


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

export type Message = {
    id: string;
    senderId: string;
    text: string;
    userName: string;
    avatarUrl: string;
    createdAt: any;
};

export type Expense = {
    id: string;
    paidBy: string;
    amount: number;
    label: string;
};


const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

export default function useTripRealtime(tripId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [status, setStatus] = useState<"connecting" | "online" | "offline" | "error">("connecting");
  const [error, setError] = useState<any>(null);
  const unsubs = useRef<(()=>void)[]>([]);

  useEffect(() => {
    if (!tripId) {
      setParticipants([]);
      setMessages([]);
      setExpenses([]);
      setStatus("offline");
      return;
    }

    // clear previous listeners
    unsubs.current.forEach(u => u());
    unsubs.current = [];

    setStatus("connecting");

    // Only connect if emulator is enabled
    if (!useEmulator) {
        console.warn("Realtime hook: Emulator disabled. Using local fallback for all data.");
        const t = getTripLocal(tripId);
        if (t) {
            setParticipants(t.participants ?? []);
            setMessages(t.messages ?? []);
            setExpenses(t.expenses ?? []);
        }
        setStatus("offline");
        return;
    }
    
    try {
      const { firestore } = getFirebaseInstances();
      if (!firestore) {
          throw new Error("Firestore not initialized.");
      }

      const setupSubscription = (colName: string, setter: Function, localField: keyof Trip) => {
        const colRef = collection(firestore, "trips", tripId, colName);
        let q = query(colRef);
        if (colName === 'messages') {
            q = query(colRef, orderBy("createdAt", "asc"));
        }
        
        const unsub = onSnapshot(q, (snapshot) => {
          const arr: any[] = [];
          snapshot.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
          setter(arr);
          setStatus("online");
        }, (err) => {
          console.error(`useTripRealtime (${colName}) snapshot error`, err);
          setError(err);
          try {
            const trip = getTripLocal(tripId);
            if (trip && trip[localField]) setter(trip[localField]);
            setStatus("offline");
          } catch (e) {
            setStatus("error");
          }
        });
        unsubs.current.push(unsub);
      };

      setupSubscription('participants', setParticipants, 'participants');
      setupSubscription('messages', setMessages, 'messages');
      setupSubscription('expenses', setExpenses, 'expenses');

    } catch (e) {
      console.error("useTripRealtime init error", e);
      try {
        const trip = getTripLocal(tripId);
        if (trip) {
            setParticipants(trip.participants ?? []);
            setMessages(trip.messages ?? []);
            setExpenses(trip.expenses ?? []);
        }
        setStatus("offline");
      } catch (ee) {
        setStatus("error");
        setError(ee);
      }
    }

    return () => {
      unsubs.current.forEach(u => u());
    };
  }, [tripId]);

  const joinOrUpdateParticipant = async (p: Participant) => {
      if(!tripId) return;
      try {
        const { firestore } = getFirebaseInstances();
        await setDoc(doc(firestore, "trips", tripId, 'participants', p.id), p, { merge: true });
      } catch (e) {
          console.warn("joinOrUpdateParticipant firestore error, falling back to local.", e);
          const trip = getTripLocal(tripId) || {id: tripId, participants: [], messages:[], expenses:[]};
          const existing = trip.participants.findIndex(par => par.id === p.id);
          if (existing !== -1) trip.participants[existing] = { ...trip.participants[existing], ...p };
          else trip.participants.push(p);
          saveTripLocal(tripId, trip);
          setParticipants([...trip.participants]);
      }
  };

  const sendMessage = async (payload: Omit<Message, 'id' | 'createdAt'>) => {
      if(!tripId) return;
      try {
        const { firestore } = getFirebaseInstances();
        await addDoc(collection(firestore, "trips", tripId, 'messages'), {
            ...payload, createdAt: serverTimestamp()
        });
      } catch (e) {
          console.warn("sendMessage firestore error, falling back to local.", e);
          const trip = getTripLocal(tripId) || {id: tripId, participants: [], messages:[], expenses:[]};
          trip.messages.push({ ...payload, id: `${Date.now()}`, createdAt: new Date().toISOString() });
          saveTripLocal(tripId, trip);
          setMessages([...trip.messages]);
      }
  };

  const addExpense = async (payload: Omit<Expense, 'id'>) => {
      if(!tripId) return;
      try {
        const { firestore } = getFirebaseInstances();
        await addDoc(collection(firestore, "trips", tripId, 'expenses'), payload);
      } catch (e) {
          console.warn("addExpense firestore error, falling back to local.", e);
          const trip = getTripLocal(tripId) || {id: tripId, participants: [], messages:[], expenses:[]};
          trip.expenses.push({ ...payload, id: `${Date.now()}` });
          saveTripLocal(tripId, trip);
          setExpenses([...trip.expenses]);
      }
  };

  return { participants, messages, expenses, status, error, joinOrUpdateParticipant, sendMessage, addExpense };
}

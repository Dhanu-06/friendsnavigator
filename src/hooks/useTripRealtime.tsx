// src/hooks/useTripRealtime.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { getFirebaseInstances } from "@/lib/firebaseClient";
import { getTripLocal, saveTripLocal } from "@/lib/fallbackStore";

export type Participant = {
  id: string;
  name: string;
  avatarUrl?: string;
  lat?: number;
  lng?: number;
  mode?: string;
  etaMinutes?: number;
  status?: string;
  coords?: { lat: number; lng: number };
  updatedAt?: number | null;
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

    // Immediately load from local storage for instant UI
    try {
        const localTrip = getTripLocal(tripId);
        if (localTrip) {
            setParticipants(localTrip.participants || []);
            setMessages(localTrip.messages || []);
            setExpenses(localTrip.expenses || []);
        }
    } catch(e) {
        console.warn("Initial local read failed", e);
    }
    
    if (!useEmulator) {
        console.warn("Realtime hook: Emulator disabled. Operating in offline mode.");
        setStatus("offline");
        return;
    }
    
    try {
      const { firestore } = getFirebaseInstances();
      if (!firestore) {
          throw new Error("Firestore not initialized.");
      }

      const setupSubscription = (colName: "participants" | "messages" | "expenses", setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        const colRef = collection(firestore, "trips", tripId, colName);
        const q = query(colRef);
        
        const unsub = onSnapshot(q, (snapshot) => {
          const arr: any[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Convert Firestore Timestamps to JS Dates for serialization
            const serializableData: { [key: string]: any } = {};
            for (const key in data) {
                if (data[key]?.toDate) {
                    serializableData[key] = data[key].toDate().toISOString();
                } else {
                    serializableData[key] = data[key];
                }
            }
            arr.push({ id: doc.id, ...serializableData });
          });
          setter(arr);
          // Also update local storage to keep it in sync
          const trip = getTripLocal(tripId) || {id: tripId, participants: [], messages:[], expenses:[]};
          trip[colName] = arr;
          saveTripLocal(tripId, trip);
          setStatus("online");
        }, (err) => {
          console.error(`useTripRealtime (${colName}) snapshot error. Falling back to local.`, err);
          setError(err);
          setStatus("offline");
          // Data is already loaded from local, so no need to set state here again.
        });
        unsubs.current.push(unsub);
      };

      setupSubscription('participants', setParticipants);
      setupSubscription('messages', setMessages);
      setupSubscription('expenses', setExpenses);

    } catch (e) {
      console.error("useTripRealtime init error, operating in offline mode.", e);
      setStatus("offline");
      setError(e);
    }

    return () => {
      unsubs.current.forEach(u => u());
    };
  }, [tripId]);

  const joinOrUpdateParticipant = async (p: Participant) => {
      if(!tripId) return;
      const trip = getTripLocal(tripId) || {id: tripId, participants: [], messages:[], expenses:[]};
      const existingIdx = trip.participants.findIndex((par: Participant) => par.id === p.id);
      if (existingIdx !== -1) trip.participants[existingIdx] = { ...trip.participants[existingIdx], ...p };
      else trip.participants.push(p);
      saveTripLocal(tripId, trip);
      setParticipants([...trip.participants]);
      
      if(status === 'online' || useEmulator) {
          try {
            const { firestore } = getFirebaseInstances();
            await setDoc(doc(firestore, "trips", tripId, 'participants', p.id), p, { merge: true });
          } catch (e) {
              console.warn("joinOrUpdateParticipant firestore error, already fell back to local.", e);
          }
      }
  };

  const sendMessage = async (text: string, user: {id: string, name: string, avatarUrl: string}) => {
      if(!tripId || !user) return;
      const payload: Omit<Message, 'id' | 'createdAt'> = {
          senderId: user.id,
          userName: user.name,
          avatarUrl: user.avatarUrl,
          text: text,
      };
      
      const localMsg = { ...payload, id: `${Date.now()}`, createdAt: new Date().toISOString() };
      const trip = getTripLocal(tripId) || {id: tripId, participants: [], messages:[], expenses:[]};
      trip.messages.push(localMsg);
      saveTripLocal(tripId, trip);
      setMessages([...trip.messages]);

      if(status === 'online' || useEmulator) {
          try {
            const { firestore } = getFirebaseInstances();
            await addDoc(collection(firestore, "trips", tripId, 'messages'), {
                ...payload, createdAt: serverTimestamp()
            });
          } catch (e) {
              console.warn("sendMessage firestore error, already fell back to local.", e);
          }
      }
  };

  const addExpense = async (payload: Omit<Expense, 'id'>) => {
      if(!tripId) return;
      const localExpense = { ...payload, id: `${Date.now()}` };
      const trip = getTripLocal(tripId) || {id: tripId, participants: [], messages:[], expenses:[]};
      trip.expenses.push(localExpense);
      saveTripLocal(tripId, trip);
      setExpenses([...trip.expenses]);

      if(status === 'online' || useEmulator) {
          try {
            const { firestore } = getFirebaseInstances();
            await addDoc(collection(firestore, "trips", tripId, 'expenses'), payload);
          } catch (e) {
              console.warn("addExpense firestore error, already fell back to local.", e);
          }
      }
  };

  return { participants, messages, expenses, status, error, joinOrUpdateParticipant, sendMessage, addExpense };
}

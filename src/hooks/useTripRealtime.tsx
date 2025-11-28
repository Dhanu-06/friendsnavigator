'use client';

import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  getDoc,
} from 'firebase/firestore';

import { getFirebaseInstances } from '@/lib/firebaseClient';
import { getTripLocal, saveTripLocal } from '@/lib/fallbackStore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  updatedAt?: number | any;
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

export type TripDoc = {
    id: string;
    participants: Participant[];
    messages: Message[];
    expenses: Expense[];
    pickup?: { lat: number, lng: number };
    destination?: { lat: number, lng: number };
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

export default function useTripRealtime(
  tripId: string,
  currentUser: { id: string; name: string; avatarUrl: string } | null
) {
  const [tripDoc, setTripDoc] = useState<TripDoc | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline' | 'error'>(
    'connecting'
  );
  const [error, setError] = useState<any>(null);
  const unsubs = useRef<(() => void)[]>([]);
  const firestoreRef = useRef<Firestore | null>(null);

  useEffect(() => {
    if (!tripId || !currentUser) {
      setParticipants([]);
      setMessages([]);
      setExpenses([]);
      setTripDoc(null);
      setStatus('offline');
      return;
    }

    unsubs.current.forEach((u) => u());
    unsubs.current = [];

    setStatus('connecting');

    try {
      const localTrip = getTripLocal(tripId);
      if (localTrip) {
        setTripDoc(localTrip);
        setParticipants(localTrip.participants || []);
        setMessages(localTrip.messages || []);
        setExpenses(localTrip.expenses || []);
      }
    } catch (e) {
      console.warn('Initial local read failed', e);
    }
    
    // Add current user to participants list on load
    if (currentUser) {
        const p = {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
        };
        const trip = getTripLocal(tripId) || { id: tripId, participants: [], messages: [], expenses: [] };
        if (!trip.participants.some((par: Participant) => par.id === p.id)) {
            trip.participants.push(p);
            saveTripLocal(tripId, trip);
            setParticipants([...trip.participants]);
        }
    }

    if (!useEmulator) {
      console.warn('Realtime hook: Emulator disabled. Operating in offline mode.');
      setStatus('offline');
      return;
    }

    try {
      const { firestore } = getFirebaseInstances();
      if (!firestore) {
        throw new Error('Firestore not initialized.');
      }
      firestoreRef.current = firestore;

      const docRef = doc(firestore, 'trips', tripId);
      const mainUnsub = onSnapshot(docRef, 
        (snap) => {
            const data = snap.data() as TripDoc;
            if (data) {
                setTripDoc(data);
                saveTripLocal(tripId, data);
            }
        },
        async (err) => {
            setError(err);
            setStatus('offline');
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
      );
      unsubs.current.push(mainUnsub);


      const setupSubscription = (
        colName: 'participants' | 'messages' | 'expenses',
        setter: React.Dispatch<React.SetStateAction<any[]>>
      ) => {
        const colRef = collection(firestore, 'trips', tripId, colName);
        const q = query(colRef);

        const unsub = onSnapshot(
          q,
          (snapshot) => {
            const arr: any[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
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
            const trip = getTripLocal(tripId) || {
              id: tripId,
              participants: [],
              messages: [],
              expenses: [],
            };
            trip[colName] = arr;
            saveTripLocal(tripId, trip);
            setStatus('online');
          },
          async (err) => {
            setError(err);
            setStatus('offline');
            const permissionError = new FirestorePermissionError({
              path: colRef.path,
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        );
        unsubs.current.push(unsub);
      };

      setupSubscription('participants', setParticipants);
      setupSubscription('messages', setMessages);
      setupSubscription('expenses', setExpenses);
    } catch (e) {
      console.error('useTripRealtime init error, operating in offline mode.', e);
      setStatus('offline');
      setError(e);
    }

    return () => {
      unsubs.current.forEach((u) => u());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, currentUser?.id]);

  const sendMessage = async (text: string) => {
    if (!tripId || !currentUser) return;
    const { id: senderId, name: userName, avatarUrl } = currentUser;
    const payload: Omit<Message, 'id' | 'createdAt'> = {
      senderId,
      userName,
      avatarUrl,
      text,
    };

    const localMsg = { ...payload, id: `${Date.now()}`, createdAt: new Date().toISOString() };
    const trip = getTripLocal(tripId) || {
      id: tripId,
      participants: [],
      messages: [],
      expenses: [],
    };
    trip.messages.push(localMsg);
    saveTripLocal(tripId, trip);
    setMessages([...trip.messages]);

    if ((status === 'online' || useEmulator) && firestoreRef.current) {
        const collRef = collection(firestoreRef.current, 'trips', tripId, 'messages');
        addDoc(collRef, {
            ...payload,
            createdAt: serverTimestamp(),
        }).catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: collRef.path,
                operation: 'create',
                requestResourceData: payload
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const addExpense = async (payload: Omit<Expense, 'id'>) => {
    if (!tripId) return;
    const localExpense = { ...payload, id: `${Date.now()}` };
    const trip = getTripLocal(tripId) || {
      id: tripId,
      participants: [],
      messages: [],
      expenses: [],
    };
    trip.expenses.push(localExpense);
    saveTripLocal(tripId, trip);
    setExpenses([...trip.expenses]);

    if ((status === 'online' || useEmulator) && firestoreRef.current) {
        const collRef = collection(firestoreRef.current, 'trips', tripId, 'expenses');
        addDoc(collRef, payload).catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: collRef.path,
                operation: 'create',
                requestResourceData: payload
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  return {
    tripDoc,
    participants,
    messages,
    expenses,
    status,
    error,
    sendMessage,
    addExpense,
  };
}

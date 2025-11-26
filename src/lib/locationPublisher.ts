'use client';

import { initializeFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
const { firestore: db } = initializeFirebase();

type Coords = {
    lat: number;
    lng: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    timestamp?: number;
}

type User = {
    id: string;
    name: string;
    avatarUrl?: string | null;
}

/**
 * publishParticipantLocation(tripId, user, coords)
 * - Writes participant location to Firestore under: /trips/{tripId}/participants/{user.id}
 * - Falls back to localStorage if Firestore write fails (useful when emulator unreachable)
 */
export async function publishParticipantLocation(tripId: string, user: User, coords: Coords) {
  const payload = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    lat: coords.lat,
    lng: coords.lng,
    accuracy: coords.accuracy ?? null,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    lastUpdated: serverTimestamp(),
    lastUpdatedTimestamp: coords.timestamp ?? Date.now(),
  };

  if (!useEmulator) {
     // The realtime hook will manage the local state, so we don't need to write to localStorage here.
     return { source: "local" };
  }

  if (!db) {
      console.error("publishParticipantLocation: Firestore instance is not available. Cannot publish location.");
      throw new Error("Firestore not initialized.");
  }

  try {
    const ref = doc(db as Firestore, "trips", tripId, "participants", user.id);
    await setDoc(ref, payload, { merge: true });
    return { source: "firestore" };
  } catch (err) {
    console.warn("publishParticipantLocation: Firestore write failed. The useTripRealtime hook will handle local storage fallback.", err);
    // Throw the error so the caller knows the write failed, allowing the UI to react if needed.
    throw err;
  }
}

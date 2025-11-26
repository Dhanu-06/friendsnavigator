'use client';

import { db } from '@/firebase/client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

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
     console.warn("publishParticipantLocation: Firestore emulator not enabled, using localStorage fallback.");
     // Fallback logic is handled by useTripRealtime hook. We just won't throw an error.
     return { source: "local" };
  }

  try {
    const ref = doc(db, "trips", tripId, "participants", user.id);
    await setDoc(ref, payload, { merge: true });
    return { source: "firestore" };
  } catch (err) {
    console.warn("publishParticipantLocation: Firestore write failed. The useTripRealtime hook will handle local storage fallback.", err);
    // The realtime hook will manage the local state, so we don't need to write to localStorage here.
    // We throw the error so the caller knows the write failed.
    throw err;
  }
}

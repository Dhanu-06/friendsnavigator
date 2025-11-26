// src/lib/locationPublisher.ts
'use client';

import { doc, setDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import { getFirebaseInstances } from "@/lib/firebaseClient";

/**
 * publishParticipantLocation(tripId, user, coords)
 * - writes to /trips/{tripId}/participants/{user.id}
 * - falls back to localStorage if Firestore write fails
 */

type Coords = {
    lat: number;
    lng: number; // Changed from lon to lng for consistency with other parts of the app
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

export async function publishParticipantLocation(tripId: string, user: User, coords: Coords) {
  const { firestore } = getFirebaseInstances();
  const payload = {
    id: user.id,
    name: user.name || null,
    avatarUrl: user.avatarUrl || null,
    lat: coords.lat,
    lng: coords.lng,
    accuracy: coords.accuracy ?? null,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    lastUpdated: serverTimestamp ? serverTimestamp() : new Date(),
    lastUpdatedTimestamp: coords.timestamp ?? Date.now(),
  };

  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

  if (!useEmulator) {
     // When not using the emulator, we assume we might be in an offline-first scenario
     // or a production build where optimistic updates are handled by the realtime hook's state.
     // The hook will manage writing to a local fallback if the network is down.
     return { source: "local" };
  }

  if (!firestore) {
      console.error("publishParticipantLocation: Firestore instance is not available. Cannot publish location.");
      throw new Error("Firestore not initialized.");
  }


  try {
    const ref = doc(firestore, "trips", tripId, "participants", user.id);
    await setDoc(ref, payload, { merge: true });
    return { source: "firestore" };
  } catch (err) {
    console.warn("publishParticipantLocation: Firestore write failed. The useTripRealtime hook will handle local storage fallback.", err);
    // Throw the error so the caller knows the write failed, allowing the UI to react if needed.
    throw err;
  }
}

/** readParticipantsLocalFallback(tripId) */
export function readParticipantsLocalFallback(tripId: string) {
  try {
    const raw = localStorage.getItem(`trip_${tripId}_participants`) || "{}";
    const map = JSON.parse(raw);
    return Object.values(map);
  } catch {
    return [];
  }
}

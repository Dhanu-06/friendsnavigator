'use client';

import { doc, setDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import { getFirebaseInstances } from "@/lib/firebaseClient";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

/**
 * publishParticipantLocation(tripId, user, coords)
 * - writes to /trips/{tripId}/participants/{user.id}
 * - falls back to localStorage if Firestore write fails
 */

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

export async function publishParticipantLocation(tripId: string, user: User, coords: Coords) {
  const { firestore } = getFirebaseInstances();
  const payload = {
    id: user.id,
    name: user.name || null,
    avatarUrl: user.avatarUrl || null,
    coords: {
      lat: coords.lat,
      lng: coords.lng,
      accuracy: coords.accuracy ?? null,
      heading: coords.heading ?? null,
      speed: coords.speed ?? null,
    },
    lastUpdated: serverTimestamp ? serverTimestamp() : new Date(),
    lastUpdatedTimestamp: coords.timestamp ?? Date.now(),
  };

  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

  if (!useEmulator) {
     return { source: "local" };
  }

  if (!firestore) {
      console.error("publishParticipantLocation: Firestore instance is not available. Cannot publish location.");
      throw new Error("Firestore not initialized.");
  }


  const ref = doc(firestore, "trips", tripId, "participants", user.id);
  try {
    await setDoc(ref, payload, { merge: true });
    return { source: "firestore" };
  } catch (err) {
    console.warn("publishParticipantLocation: Firestore write failed. The useTripRealtime hook will handle local storage fallback.", err);
    const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'update',
        requestResourceData: payload,
    });
    errorEmitter.emit('permission-error', permissionError);
    // Return a resolved promise with an error indicator instead of throwing
    return { source: "error", error: err };
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

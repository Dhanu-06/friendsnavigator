// src/lib/storeAdapter.ts
import { getFirebaseInstances } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getTripLocal, saveTripLocal, addParticipantLocal, getRecentTripsLocal } from "@/lib/fallbackStore";
import type { Trip } from './tripStore';

/**
 * storeAdapter:
 * - getTrip: try firestore -> fallback to local
 * - saveTrip: try firestore -> fallback local
 * - joinTrip: try to add participant in firestore, fallback to local on failure
 */

export async function getTrip(tripId: string): Promise<{data: Trip | null, source: string}> {
  try {
    const { firestore } = getFirebaseInstances();
    if (!firestore) throw new Error("Firestore not initialized");

    const ref = doc(firestore, "trips", tripId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return { data: snap.data() as Trip, source: "firestore" };
    }
    
    // If not in Firestore, check local storage
    const local = getTripLocal(tripId);
    return { data: local, source: local ? "local-fallback" : "none" };
  } catch (e) {
    console.warn("getTrip: Firestore read failed, falling back to local storage.", e);
    const local = getTripLocal(tripId);
    return { data: local, source: local ? "local-fallback" : "error" };
  }
}

export async function saveTrip(tripId: string, data: any) {
  // Always save locally first for immediate UI feedback
  const saved = saveTripLocal(tripId, data);
  try {
    const { firestore } = getFirebaseInstances();
    if (!firestore) throw new Error("Firestore not initialized");
    const ref = doc(firestore, "trips", tripId);
    await setDoc(ref, data, { merge: true });
    return { source: "firestore" };
  } catch (e) {
    console.warn("saveTrip: Firestore write failed, using localStorage fallback.", e);
    return { source: "local-fallback", data: saved };
  }
}

export async function joinTrip(tripId: string, participant: any) {
    // Optimistically update local storage first
    addParticipantLocal(tripId, participant);
    try {
        const { firestore } = getFirebaseInstances();
        if (!firestore) throw new Error("Firestore not initialized");
        const ref = doc(firestore, "trips", tripId);

        const snap = await getDoc(ref);
        if (!snap.exists()) {
            // If trip doesn't exist remotely, create it from the local version
            const newTrip = getTripLocal(tripId);
            if (newTrip) {
                await setDoc(ref, newTrip, { merge: true });
                return { source: "firestore-created" };
            }
        } else {
            // Otherwise, merge the participant into the existing trip
            const existingData = snap.data() || {};
            const participants = existingData.participants || [];
            if (!participants.some((p: any) => p.id === participant.id)) {
                participants.push(participant);
            }
            await setDoc(ref, { participants }, { merge: true });
            return { source: "firestore-updated" };
        }
         return { source: 'local-fallback' }; // Should not be reached if writes succeed
    } catch (e) {
        console.warn("joinTrip: Firestore operation failed, already fell back to local.", e);
        return { source: "local-fallback" };
    }
}


export async function getRecentTrips(): Promise<Trip[]> {
    // For this app, we will always source recent trips from local storage for simplicity and speed.
    return Promise.resolve(getRecentTripsLocal());
}

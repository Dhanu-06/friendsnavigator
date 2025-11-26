
// src/lib/storeAdapter.ts
import { getFirebaseInstances } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getTripLocal, saveTripLocal, addParticipantLocal, getRecentTripsLocal } from "./fallbackStore";
import type { Trip } from './tripStore';


export async function getTrip(tripId: string): Promise<{data: Trip | null, source: string}> {
  try {
    const { firestore } = getFirebaseInstances();
    if (!firestore) throw new Error("Firestore not initialized");
    const ref = doc(firestore, "trips", tripId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { data: snap.data() as Trip, source: "firestore" };
    // if not present in firestore, check local
    const local = getTripLocal(tripId);
    return { data: local, source: local ? "local" : "none" };
  } catch (e) {
    // fallback to local
    console.warn("getTrip: Firestore read failed, falling back to local storage.", e);
    const local = getTripLocal(tripId);
    return { data: local, source: local ? "local-fallback" : "error" };
  }
}

export async function saveTrip(tripId: string, data: any) {
  try {
    const { firestore } = getFirebaseInstances();
    if (!firestore) throw new Error("Firestore not initialized");
    const ref = doc(firestore, "trips", tripId);
    await setDoc(ref, data, { merge: true });
    // Also save locally to ensure consistency if emulator is flaky
    saveTripLocal(tripId, data);
    return { source: "firestore" };
  } catch (e) {
    console.warn("saveTrip: Firestore write failed, using localStorage fallback.", e);
    const saved = saveTripLocal(tripId, data);
    return { source: "local-fallback", data: saved };
  }
}

export async function joinTrip(tripId: string, participant: any) {
    addParticipantLocal(tripId, participant);
    try {
        const { firestore } = getFirebaseInstances();
        if (!firestore) throw new Error("Firestore not initialized");
        const ref = doc(firestore, "trips", tripId);

        const snap = await getDoc(ref);
        if (!snap.exists()) {
            // If trip doesn't exist remotely, create it with the participant
            const newTrip = getTripLocal(tripId);
            await setDoc(ref, newTrip, { merge: true });
            return { source: "firestore-created" };
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
    } catch (e) {
        console.warn("joinTrip: Firestore operation failed, already fell back to local.", e);
        // The local update was already performed optimistically.
        return { source: "local-fallback" };
    }
}

export async function getRecentTrips(): Promise<Trip[]> {
    // For simplicity, this demo will rely on the local storage version for recent trips.
    // A production app might try to fetch from Firestore first.
    return Promise.resolve(getRecentTripsLocal());
}

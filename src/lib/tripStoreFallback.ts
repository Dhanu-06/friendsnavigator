// lib/tripStoreFallback.ts
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getFirebaseInstances } from "./firebaseClient";

const { firestore } = getFirebaseInstances();

export async function saveTripFallback(tripId: string, data: any) {
  try {
    const ref = doc(firestore, "trips", tripId);
    await setDoc(ref, data, { merge: true });
    return { source: "firestore" };
  } catch (e) {
    console.warn("Firestore write failed; using localStorage fallback", e);
    const raw = localStorage.getItem("trips") || "{}";
    const map = JSON.parse(raw);
    map[tripId] = data;
    localStorage.setItem("trips", JSON.stringify(map));
    return { source: "local" };
  }
}

export async function getTripFallback(tripId: string) {
  try {
    const ref = doc(firestore, "trips", tripId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { data: snap.data(), source: "firestore" };
    return { data: null, source: "firestore" };
  } catch (e) {
    console.warn("Firestore read failed; falling back to localStorage", e);
    const raw = localStorage.getItem("trips") || "{}";
    const map = JSON.parse(raw);
    return { data: map[tripId] || null, source: "local" };
  }
}

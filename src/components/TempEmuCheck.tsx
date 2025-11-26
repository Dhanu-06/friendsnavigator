// src/components/TempEmuCheck.tsx
"use client";
import { useEffect } from "react";
import { getFirebaseInstances } from "@/lib/firebaseClient";

export default function TempEmuCheck() {
  useEffect(() => {
    console.log("ENV EMU HOST:", process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST, process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT);
    fetch(`http://${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST}:${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT}/`)
      .then(r => console.log("emulator http test status:", r.status))
      .catch(e => console.error("emulator http test failed:", e));
    try {
      const { auth, firestore } = getFirebaseInstances();
      console.log("Firebase instances:", !!auth, !!firestore);
    } catch (err) {
      console.error("getFirebaseInstances error", err);
    }
  }, []);
  return null;
}

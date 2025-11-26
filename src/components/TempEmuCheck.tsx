// src/components/TempEmuCheck.tsx
"use client";
import { useEffect } from "react";
import { getFirebaseInstances } from "@/lib/firebaseClient";

export default function TempEmuCheck() {
  useEffect(() => {
    (async () => {
      try {
        console.log("ENV EMU HOST:", process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST, process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT);
        const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "localhost";
        const port = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8080";
        // safe fetch with timeout wrapper
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        try {
          const r = await fetch(`http://${host}:${port}/`, { signal: controller.signal });
          console.log("emulator http test status:", r.status);
        } catch (e) {
          console.warn("emulator http test failed (expected in some envs):", e);
        } finally {
          clearTimeout(timer);
        }

        try {
          const { auth, firestore } = getFirebaseInstances();
          console.log("Firebase instances created", { auth: !!auth, firestore: !!firestore });
        } catch (err) {
          console.warn("getFirebaseInstances error (safe):", err);
        }
      } catch (err) {
        console.warn("TempEmuCheck general error:", err);
      }
    })();
  }, []);
  return null;
}

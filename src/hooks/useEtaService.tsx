// src/hooks/useEtaService.tsx
import { useRef, useState, useCallback } from "react";

/**
 * useEtaService
 * - call updateRaw(participantId, { etaSeconds?, distanceMeters? })
 * - it will synthesize a composed ETA (preference: matrix ETA, fallback to distance-based estimate)
 * - smoothing: exponential smoothing to avoid jitter
 * - returns getter getSmoothed(participantId) and a subscribe method (simple React state trigger)
 */

type RawUpdate = { etaSeconds?: number; distanceMeters?: number; timestamp?: number };

type Smoothed = {
  etaSeconds: number;
  distanceMeters?: number;
  lastUpdated: number;
};

export default function useEtaService({ smoothingAlpha = 0.25, assumedSpeedKmph = 40 } = {}) {
  const storeRef = useRef<Record<string, Smoothed>>({});
  const listenersRef = useRef<(() => void)[]>([]);
  const [, setTick] = useState(0);
  const alpha = smoothingAlpha;
  const assumedSpeedMs = (assumedSpeedKmph * 1000) / 3600; // m/s

  const notify = useCallback(() => {
    setTick((t) => t + 1);
    listenersRef.current.forEach((fn) => {
      try { fn(); } catch {}
    });
  }, []);

  const synthesize = useCallback((raw: RawUpdate) => {
    // prefer matrix ETA if provided
    if (typeof raw.etaSeconds === "number") return raw.etaSeconds;
    // fallback: if distance available, estimate by assumedSpeed
    if (typeof raw.distanceMeters === "number") {
      const s = Math.max(assumedSpeedMs, 0.5); // avoid div0
      return Math.round(raw.distanceMeters / s);
    }
    return undefined;
  }, [assumedSpeedMs]);

  const updateRaw = useCallback((participantId: string, raw: RawUpdate) => {
    if (!participantId) return;
    const now = Date.now();
    const composed = synthesize(raw);
    if (typeof composed !== "number") {
      // nothing to update
      return;
    }
    const prev = storeRef.current[participantId];
    if (!prev) {
      storeRef.current[participantId] = { etaSeconds: composed, distanceMeters: raw.distanceMeters, lastUpdated: now };
      notify();
      return;
    }
    // Exponential smoothing: new = alpha * measured + (1 - alpha) * prev
    const smoothed = Math.round(alpha * composed + (1 - alpha) * prev.etaSeconds);
    storeRef.current[participantId] = { etaSeconds: smoothed, distanceMeters: raw.distanceMeters ?? prev.distanceMeters, lastUpdated: now };
    notify();
  }, [alpha, notify, synthesize]);

  const getSmoothed = useCallback((participantId: string): Smoothed | undefined => {
    return storeRef.current[participantId];
  }, []);

  const subscribe = useCallback((fn: () => void) => {
    listenersRef.current.push(fn);
    return () => {
      listenersRef.current = listenersRef.current.filter((f) => f !== fn);
    };
  }, []);

  const reset = useCallback(() => {
    storeRef.current = {};
    notify();
  }, [notify]);

  return { updateRaw, getSmoothed, subscribe, reset };
}

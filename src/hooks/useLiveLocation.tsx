'use client';

import { useEffect, useRef, useState } from "react";
import { publishParticipantLocation } from "@/lib/locationPublisher";

type Coords = { lat: number; lng: number; accuracy?: number; heading?: number; speed?: number; timestamp?: number };
type User = { id: string; name: string; avatarUrl?: string | null };

export default function useLiveLocation(tripId: string | null, user: User | null, opts?: {
  watchIntervalMs?: number; // how often to push (debounce)
  enableWatch?: boolean;
}) {
  const { watchIntervalMs = 5000, enableWatch = true } = opts || {};
  const watchIdRef = useRef<number | null>(null);
  const lastPublishedRef = useRef<number>(0);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [lastPosition, setLastPosition] = useState<Coords | null>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !("geolocation" in navigator)) {
      setError(new Error("Geolocation not available in this browser"));
      setPermission("denied");
      return;
    }

    // try query permission API
    if ((navigator as any).permissions && (navigator as any).permissions.query) {
      try {
        (navigator as any).permissions.query({ name: "geolocation" }).then((res: any) => {
          setPermission(res.state);
          res.onchange = () => setPermission(res.state);
        }).catch(() => {});
      } catch (e) {}
    }

    if (!enableWatch || !tripId || !user) {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        return;
    }

    const success = (pos: GeolocationPosition) => {
      const coords: Coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading ?? undefined,
        speed: pos.coords.speed ?? undefined,
        timestamp: pos.timestamp || Date.now(),
      };
      setLastPosition(coords);
      setPermission('granted');

      const now = Date.now();
      if (now - lastPublishedRef.current >= watchIntervalMs) {
        lastPublishedRef.current = now;
        publishParticipantLocation(tripId, user, coords).catch(e => {
            // This catch block prevents an unhandled rejection from crashing the app
            console.error("Failed publishing location. The app will continue with local updates.", e);
        });
      }
    };

    const fail = (err: GeolocationPositionError) => {
      console.error("geolocation watch error", err);
      setError(err);
      if (err.code === 1) { // PERMISSION_DENIED
        setPermission('denied');
      }
    };
    
    // Clear any existing watch
    if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const id = navigator.geolocation.watchPosition(success, fail, { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 });
    watchIdRef.current = id;
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, user?.id, enableWatch, watchIntervalMs]);

  return { permission, lastPosition, error };
}

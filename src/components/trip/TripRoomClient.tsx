// src/components/TripRoomClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import useTripRealtime from "@/hooks/useTripRealtime";
import useLiveLocation from "@/hooks/useLiveLocation";
import { getTrip } from "@/lib/storeAdapter";

const TomTomMapController = dynamic(() => import("@/components/trip/TomTomMapController"), { ssr: false });

type LatLng = { lat: number; lng: number };

type Participant = {
  id: string;
  name?: string;
  avatar?: string | null;
  coords?: LatLng;
};

type Props = {
  tripId: string;
  currentUser: { id: string; name: string; avatar?: string | null } | null;
  initialTrip?: { origin?: any; destination?: any } | null;
};

export default function TripRoomClient({ tripId, currentUser, initialTrip = null }: Props) {
  // Realtime participants from Firestore / fallback
  const { participants: realtimeParticipants, status } = useTripRealtime(tripId);

  // Publish current user's live location (if currentUser provided)
  useLiveLocation(tripId, currentUser ?? { id: "anon", name: "Guest" }, { watchIntervalMs: 5000, enableWatch: true });

  // Local state for trip metadata
  const [tripMeta, setTripMeta] = useState<any>(initialTrip);

  // Local state for ETAs reported by server (matrix) or fallback
  const [etas, setEtas] = useState<Record<string, { etaSeconds: number | null; distanceMeters: number | null }>>({});

  // Convert realtime participants into the shape Map expects
  const participants = useMemo(() => {
    return (realtimeParticipants || []).map((p: any) => ({
      id: p.id,
      name: p.name || "Unknown",
      avatar: p.avatar || null,
      coords: p.coords ? { lat: p.coords.lat, lng: p.coords.lng } : undefined,
    })) as Participant[];
  }, [realtimeParticipants]);

  // Sorted ETA list for UI
  const friendsETAList = useMemo(() => {
    return participants
      .map((p) => {
        const e = etas[p.id] || { etaSeconds: null, distanceMeters: null };
        return {
          id: p.id,
          name: p.name,
          etaSeconds: e.etaSeconds,
          distanceMeters: e.distanceMeters,
          coords: p.coords,
        };
      })
      .sort((a, b) => {
        const ta = a.etaSeconds ?? Infinity;
        const tb = b.etaSeconds ?? Infinity;
        return ta - tb;
      });
  }, [participants, etas]);

  // Fetch initial trip metadata if not provided
  useEffect(() => {
    if (!initialTrip && tripId) {
      (async () => {
        try {
          const r = await getTrip(tripId);
          if (r?.data) setTripMeta(r.data);
        } catch (e) {
          console.error("TripRoomClient: failed to fetch initial trip meta", e);
        }
      })();
    }
  }, [tripId, initialTrip]);

  // Matrix API batching: request ETAs for all participants -> destination
  const matrixThrottleMs = 3000; // min interval between matrix calls
  const lastMatrixAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchMatrixETAs() {
      if (cancelled) return;
      if (!participants || participants.length === 0) {
        setEtas({});
        return;
      }
      if (!tripMeta?.destination?.lat) {
        return;
      }
      const now = Date.now();
      if (now - lastMatrixAtRef.current < matrixThrottleMs) return;
      lastMatrixAtRef.current = now;

      const origins = participants
        .filter((p) => p.coords && typeof p.coords.lat === "number")
        .map((p) => ({ id: p.id, lat: p.coords!.lat, lng: p.coords!.lng }));

      if (origins.length === 0) return;

      try {
        const res = await fetch("/api/matrix-eta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origins,
            destination: { lat: tripMeta.destination.lat, lng: tripMeta.destination.lng },
          }),
        });
        const json = await res.json();
        if (json?.results && Array.isArray(json.results)) {
          setEtas((prev) => {
            const copy = { ...prev };
            for (const r of json.results) {
              copy[r.id] = { etaSeconds: r.etaSeconds ?? null, distanceMeters: r.distanceMeters ?? null };
            }
            return copy;
          });
        } else if (json?.raw && Array.isArray(json.raw?.results)) {
          // some fallback shapes
          setEtas((prev) => {
            const copy = { ...prev };
            for (const r of json.raw.results) {
              copy[r.id] = { etaSeconds: r.etaSeconds ?? null, distanceMeters: r.distanceMeters ?? null };
            }
            return copy;
          });
        } else {
          // unexpected response — log for debugging
          console.warn("matrix-eta returned unexpected shape", json);
        }
      } catch (e) {
        console.error("matrix-eta fetch failed", e);
      }
    }

    fetchMatrixETAs();
    const iv = setInterval(fetchMatrixETAs, 8000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // depend on participants and destination coords
  }, [participants, tripMeta?.destination?.lat, tripMeta?.destination?.lng]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, height: "100vh" }}>
      <div style={{ height: "100%" }}>
        <TomTomMapController
          origin={tripMeta?.origin}
          destination={tripMeta?.destination}
          participants={participants}
          computeRoutes={false}
        />
      </div>

      <aside style={{ padding: 16, background: "#f7fafc", overflow: "auto" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Trip — Live Tracker</div>
          <div style={{ fontSize: 13, color: "#555" }}>
            Status: <strong>{status}</strong>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Friends (by ETA)</div>
        </div>

        {friendsETAList.length === 0 ? (
          <div style={{ color: "#666" }}>Waiting for participant locations…</div>
        ) : (
          friendsETAList.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 10,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{f.coords ? `${f.coords.lat.toFixed(4)}, ${f.coords.lng.toFixed(4)}` : "no coords"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800 }}>{f.etaSeconds ? `${Math.round(f.etaSeconds / 60)} min` : "—"}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{f.distanceMeters ? `${(f.distanceMeters / 1000).toFixed(1)} km` : "—"}</div>
              </div>
            </div>
          ))
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug</div>
          <div style={{ fontSize: 13, color: "#666" }}>Participants: {participants.length}</div>
        </div>
      </aside>
    </div>
  );
}

// src/components/trip/TripRoomClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import useTripRealtime from "@/hooks/useTripRealtime";
import useLiveLocation from "@/hooks/useLiveLocation";
import { getTrip } from "@/lib/storeAdapter";

const TomTomMapController = dynamic(() => import("@/components/trip/TomTomMapController"), { ssr: false });

type LatLng = { lat: number; lon: number };

type Participant = {
  id: string;
  name?: string;
  avatar?: string | null;
  coords?: LatLng;
};

type Props = {
  tripId: string;
  currentUser: { id: string; name: string; avatar?: string | null };
  // if you server-rendered initialTrip, pass it; otherwise optional
  initialTrip?: { origin?: any; destination?: any };
};

export default function TripRoomClient({ tripId, currentUser, initialTrip }: Props) {
  // realtime participants from firestore / fallback
  const { participants: realtimeParticipants, status } = useTripRealtime(tripId);

  // publish current user's live location
  useLiveLocation(tripId, currentUser, { watchIntervalMs: 5000, enableWatch: true });

  // local state for ETAs reported by map
  const [etas, setEtas] = useState<Record<string, { etaSeconds: number | null; distanceMeters: number | null }>>({});

  // Optional: if you want to fetch fresh trip metadata (origin/destination)
  const [tripMeta, setTripMeta] = useState<any>(initialTrip || null);
  useEffect(() => {
    if (!initialTrip && tripId) {
      (async () => {
        const r = await getTrip(tripId);
        if (r?.data) setTripMeta(r.data);
      })();
    }
  }, [tripId, initialTrip]);

  // participants to pass to map (use realtimeParticipants; ensure coords shape correct)
  const participants = useMemo(() => {
    return (realtimeParticipants || []).map((p: any) => ({
      id: p.id,
      name: p.name || "Unknown",
      avatar: p.avatar || null,
      coords: p.coords ? { lat: p.coords.lat, lon: p.coords.lon } : undefined,
    })) as Participant[];
  }, [realtimeParticipants]);

  const matrixThrottleMs = 3000; // don't call server more often than this
  const lastMatrixAtRef = useRef<number>(0);

  useEffect(() => {
    async function fetchMatrixETAs() {
      if (!participants || participants.length === 0) {
        setEtas({});
        return;
      }
      if (!tripMeta?.destination?.lat) { // Check for lat on destination
        // no destination known yet
        return;
      }
      const now = Date.now();
      if (now - lastMatrixAtRef.current < matrixThrottleMs) return;
      lastMatrixAtRef.current = now;

      const origins = participants
        .filter((p) => p.coords && typeof p.coords.lat === "number")
        .map((p) => ({ id: p.id, lat: p.coords!.lat, lon: p.coords!.lon }));

      if (origins.length === 0) return;

      try {
        const res = await fetch("/api/matrix-eta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origins, destination: { lat: tripMeta.destination.lat, lon: tripMeta.destination.lng } }), // use lat/lng for destination
        });
        const json = await res.json();
        if (json?.results) {
          // results: [{ id, etaSeconds, distanceMeters }, ...]
          setEtas((prev) => {
            const copy = { ...prev };
            for (const r of json.results) {
              copy[r.id] = { etaSeconds: r.etaSeconds, distanceMeters: r.distanceMeters };
            }
            return copy;
          });
        } else if (json?.raw) {
          // unexpected structure: client fallback - still try to parse
          console.warn("matrix-eta returned unexpected shape", json);
        }
      } catch (e) {
        console.error("matrix-eta fetch failed", e);
      }
    }

    fetchMatrixETAs();
    // also refetch on interval in background (optional)
    const iv = setInterval(fetchMatrixETAs, 8000);
    return () => clearInterval(iv);
  }, [participants, tripMeta?.destination?.lat, tripMeta?.destination?.lng]); // Use lng

  // build sorted ETA list for UI
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
          <div style={{ fontSize: 13, color: "#555" }}>Status: <strong>{status}</strong></div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Friends (by ETA)</div>
        </div>

        {friendsETAList.length === 0 ? (
          <div style={{ color: "#666" }}>Waiting for participant locations…</div>
        ) : (
          friendsETAList.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{f.coords ? `${f.coords.lat.toFixed(4)}, ${f.coords.lon.toFixed(4)}` : "no coords"}</div>
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

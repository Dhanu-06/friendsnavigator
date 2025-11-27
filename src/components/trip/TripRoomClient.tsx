
// src/components/trip/TripRoomClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  currentUser: { id: string; name: string; avatar?: string | null } | null;
  initialTrip?: { origin?: any; destination?: any } | null;
};

export default function TripRoomClient({ tripId, currentUser, initialTrip = null }: Props) {
  // Realtime participants from Firestore / fallback
  const { participants: realtimeParticipants, status } = useTripRealtime(tripId);

  // Publish current user's live location
  useLiveLocation(tripId, currentUser ?? { id: "anon", name: "Guest" }, { watchIntervalMs: 5000, enableWatch: true });

  // Local state for trip metadata
  const [tripMeta, setTripMeta] = useState<any>(initialTrip);
  
  // State to hold latest ETA & distance per participant id, updated by the map controller
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number | null; distanceMeters: number | null }>>({});

  // Callback used by the map to push ETA updates up to this component
  const handleParticipantETA = useCallback((id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => {
    setParticipantETAs(prev => ({ ...prev, [id]: data }));
  }, []);

  // Convert realtime participants array into the shape the Map Controller expects
  const participantsForMap = useMemo(() => {
    return (realtimeParticipants || []).map((p: any) => ({
      id: p.id,
      name: p.name || "Unknown",
      avatar: p.avatarUrl || null,
      coords: p.coords ? { lat: p.coords.lat, lon: p.coords.lng } : undefined,
    })) as Participant[];
  }, [realtimeParticipants]);

  // Sorted ETA list for UI, derived from map controller updates
  const friendsETAList = useMemo(() => {
    return participantsForMap
      .map((p) => {
        const e = participantETAs[p.id] || { etaSeconds: null, distanceMeters: null };
        return {
          id: p.id,
          name: p.name,
          etaSeconds: e.etaSeconds,
          distanceMeters: e.distanceMeters,
          coords: p.coords ? {lat: p.coords.lat, lon: p.coords.lng } : undefined,
        };
      })
      .sort((a, b) => {
        const ta = a.etaSeconds ?? Infinity;
        const tb = b.etaSeconds ?? Infinity;
        return ta - tb;
      });
  }, [participantsForMap, participantETAs]);

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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, height: "100vh" }}>
      <div style={{ height: "100%" }}>
        <TomTomMapController
          origin={tripMeta?.origin}
          destination={{
              ...tripMeta?.destination,
              coords: tripMeta?.destination ? { lon: tripMeta.destination.lng, lat: tripMeta.destination.lat } : undefined,
          }}
          participants={participantsForMap}
          computeRoutes={true} // This enables the ETA polling in the controller
          onParticipantETA={handleParticipantETA}
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
          <div style={{ fontSize: 13, color: "#666" }}>Participants: {participantsForMap.length}</div>
        </div>
      </aside>
    </div>
  );
}

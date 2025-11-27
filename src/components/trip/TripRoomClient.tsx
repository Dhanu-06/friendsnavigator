// src/components/trip/TripRoomClient.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import useTripRealtime from "@/hooks/useTripRealtime";
import useLiveLocation from "@/hooks/useLiveLocation";
import { getTrip } from "@/lib/storeAdapter";

// Dynamic import prevents SSR rendering of map controller
const TomTomMapController = dynamic(
  () => import('@/components/trip/TomTomMapController'),
  { ssr: false }
);

/**
 * TripRoomClient
 *
 * Responsibilities:
 * - Provide participants data to TomTomMapController (object keyed by id)
 * - Receive ETA updates from the map via onParticipantETA and store them in local state
 * - Display a simple sidebar with participant list + ETA
 *
 * Notes: adapt the data-source code (fetch from Firestore, props, or TripRoom context) where marked.
 */

type Participant = {
  id: string;
  name?: string;
  avatar?: string | null;
  coords?: { lat: number; lon: number };
};

type Props = {
  tripId: string;
  currentUser: { id: string; name: string; avatar?: string | null } | null;
  initialTrip?: { origin?: any; destination?: any } | null;
};

export default function TripRoomClient({ tripId, currentUser, initialTrip = null }: Props) {
  // ----------------------------
  // Data Fetching
  // ----------------------------
  const { participants: realtimeParticipants, status } = useTripRealtime(tripId);
  useLiveLocation(tripId, currentUser ?? { id: "anon", name: "Guest" }, { watchIntervalMs: 5000, enableWatch: true });
  const [tripMeta, setTripMeta] = useState<any>(initialTrip);


  // ----------------------------
  // Local UI state
  // ----------------------------
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number | null; distanceMeters: number | null }>>({});
  const [followId, setFollowId] = useState<string | null>(null);

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

  // ----------------------------
  // Data Transformation
  // ----------------------------
  const participantsForMap = useMemo(() => {
    return (realtimeParticipants || []).map((p: any) => ({
      id: p.id,
      name: p.name || "Unknown",
      avatar: p.avatarUrl || null,
      coords: p.coords ? { lat: p.coords.lat, lon: p.coords.lng } : undefined,
    })) as Participant[];
  }, [realtimeParticipants]);

  const friendsETAList = useMemo(() => {
    return participantsForMap
      .map((p) => {
        const e = participantETAs[p.id] || { etaSeconds: null, distanceMeters: null };
        return {
          id: p.id,
          name: p.name,
          etaSeconds: e.etaSeconds,
          distanceMeters: e.distanceMeters,
          coords: p.coords ? {lat: p.coords.lat, lng: p.coords.lon } : undefined,
        };
      })
      .sort((a, b) => {
        const ta = a.etaSeconds ?? Infinity;
        const tb = b.etaSeconds ?? Infinity;
        return ta - tb;
      });
  }, [participantsForMap, participantETAs]);


  // ----------------------------
  // Callbacks & Effects
  // ----------------------------
  const handleParticipantETA = useCallback((id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => {
    setParticipantETAs(prev => ({ ...prev, [id]: data }));
  }, []);

  useEffect(() => {
    if (currentUser) {
      setFollowId(currentUser.id);
      const timer = setTimeout(() => setFollowId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const formatETA = (s?: number | null) => {
    if (s === undefined || s === null) return '--';
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m`;
  };

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className='w-full h-full flex' style={{ minHeight: 360 }}>
      {/* Left: Map (flex-grow) */}
      <div style={{ flex: 1, minHeight: 360 }}>
        <TomTomMapController
          destination={{
              ...tripMeta?.destination,
              coords: tripMeta?.destination ? { lon: tripMeta.destination.lng, lat: tripMeta.destination.lat } : undefined,
          }}
          participants={participantsForMap}
          computeRoutes={true}
          onParticipantETA={handleParticipantETA}
        />
      </div>

      {/* Right: Sidebar */}
      <aside
        style={{
          width: 320,
          borderLeft: '1px solid #e6e6e6',
          padding: 12,
          background: '#f7fafc',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Participants</h4>
          <div style={{ fontSize: 12, color: '#666' }}>{status === 'connecting' ? 'Loading...' : friendsETAList.length}</div>
        </div>

        {/* Participant list */}
        <div>
          {friendsETAList.length === 0 ? (
            <div style={{ padding: 8, color: '#777' }}>Waiting for participant locations...</div>
          ) : (
            friendsETAList.map((p) => {
              const eta = participantETAs[p.id];
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 8,
                    borderRadius: 8,
                    marginBottom: 8,
                    border: '1px solid #f0f0f0',
                    background: 'white'
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 8,
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#3b82f6',
                      fontSize: 13,
                    }}
                  >
                    {(p.name || '??').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.name || 'Unnamed'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {eta ? `${Math.round(eta.distanceMeters ?? 0)} m • ${formatETA(eta.etaSeconds)}` : 'ETA —'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      onClick={() => {
                        setFollowId(p.id);
                        setTimeout(() => setFollowId(null), 3000);
                      }}
                      style={{
                        fontSize: 12,
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #e6e6e6',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Follow
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

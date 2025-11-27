'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const TomTomMapController = dynamic(
  () => import('@/components/trip/TomTomMapController'),
  { ssr: false }
);

import RideButton from './RideButton';
import useReverseGeocode from '@/hooks/useReverseGeocode';

type Participant = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
};

type Props = {
  participantsFromProps?: Participant[];
  fetchFromFirestore?: boolean;
  tripId?: string;
  className?: string;
};

export default function TripRoomClient({
  participantsFromProps,
  fetchFromFirestore = false,
  tripId,
  className,
}: Props) {
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number; distanceMeters: number }>>({});
  const [participantsArray, setParticipantsArray] = useState<Participant[]>(participantsFromProps || []);
  const [followId, setFollowId] = useState<string | null>(null);
  const [loadingParticipants, setLoadingParticipants] = useState<boolean>(false);

  useEffect(() => {
    if (!fetchFromFirestore) return;
    if (!tripId) {
      console.warn('TripRoomClient: fetchFromFirestore=true but tripId is not provided.');
      return;
    }
    setLoadingParticipants(true);
    let unsub: (() => void) | null = null;
    try {
      // TODO: wire to your firestore trip doc
      // const tripDocRef = doc(firestore, 'trips', tripId);
      // unsub = onSnapshot(tripDocRef, (snap) => {
      //   const data = snap.data() || {};
      //   const list = data.participants || [];
      //   setParticipantsArray(list);
      //   setLoadingParticipants(false);
      // });
    } catch (e) {
      console.error('TripRoomClient: error subscribing to Firestore trip doc', e);
      setLoadingParticipants(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [fetchFromFirestore, tripId]);

  const participantsById: Record<string, Participant> = useMemo(() => {
    const obj: Record<string, Participant> = {};
    (participantsArray || []).forEach((p) => {
      if (!p || !p.id) return;
      obj[p.id] = p;
    });
    return obj;
  }, [participantsArray]);

  const handleParticipantETA = useCallback((id: string, data: { etaSeconds: number; distanceMeters: number }) => {
    setParticipantETAs((prev) => ({ ...prev, [id]: data }));
  }, []);

  useEffect(() => {
    // setFollowId(currentUserParticipantId || null);
  }, []);

  const formatETA = (s?: number | null) => {
    if (s === undefined || s === null) return '--';
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m`;
  };

  // Example pickup/destination for demo — replace with your real state
  const pickupLat = participantsArray[0]?.lat ?? 12.9716;
  const pickupLng = participantsArray[0]?.lng ?? 77.5946;
  const destLat = participantsArray[1]?.lat ?? 12.9750;
  const destLng = participantsArray[1]?.lng ?? 77.5990;

  const { name: pickupName, shortName: pickupShort } = useReverseGeocode(pickupLat, pickupLng);
  const { name: destName, shortName: destShort } = useReverseGeocode(destLat, destLng);

  const pickup = { lat: pickupLat, lng: pickupLng, name: pickupName || pickupShort || undefined };
  const drop = { lat: destLat, lng: destLng, name: destName || destShort || undefined };

  return (
    <div className={className || 'w-full h-full flex'} style={{ minHeight: 360 }}>
      <div style={{ flex: 1, minHeight: 360 }}>
        <TomTomMapController
          participants={participantsById}
          computeRoutes={true}
          onParticipantETA={handleParticipantETA}
          followId={followId}
          initialCenter={{ lat: 12.9716, lng: 77.5946 }}
          initialZoom={12}
        />
      </div>

      <aside style={{ width: 320, borderLeft: '1px solid #e6e6e6', padding: 12, background: '#fff', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0, fontSize: 16 }}>Participants</h4>
          <div style={{ fontSize: 12, color: '#666' }}>{loadingParticipants ? 'Loading...' : Object.keys(participantsById).length}</div>
        </div>

        <div>
          {Object.values(participantsById).length === 0 ? (
            <div style={{ padding: 8, color: '#777' }}>No participants</div>
          ) : (
            Object.values(participantsById).map((p) => {
              const eta = participantETAs[p.id];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, marginBottom: 8, border: '1px solid #f0f0f0' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1E90FF', fontSize: 13 }}>
                    {(p.name || '??').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.name || 'Unnamed'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {eta ? `${Math.round(eta.distanceMeters)} m • ${formatETA(eta.etaSeconds)}` : 'ETA —'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => { setFollowId(p.id); setTimeout(() => setFollowId(null), 2000); }} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #e6e6e6', background: '#fff', cursor: 'pointer' }}>
                      Follow
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Book a ride</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <RideButton provider="uber" pickup={pickup} drop={drop}>Uber</RideButton>
            <RideButton provider="ola" pickup={pickup} drop={drop}>Ola</RideButton>
            <RideButton provider="rapido" pickup={pickup} drop={drop}>Rapido</RideButton>
            <RideButton provider="transit" pickup={pickup} drop={drop}>Transit</RideButton>
          </div>
        </div>
      </aside>
    </div>
  );
}

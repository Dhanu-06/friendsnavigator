
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import useReverseGeocode from '@/hooks/useReverseGeocode';
import RideButton from './RideButton';

// dynamic import for SSR-safety: TomTomMapController uses window and TomTom SDK
const TomTomMapController = dynamic(() => import('./TomTomMapController'), { ssr: false });

type Participant = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
};

export default function TripRoomClient({
  tripId,
  initialParticipants,
  className,
}: {
  tripId?: string;
  initialParticipants?: Participant[];
  className?: string;
}) {
  // participants state (array) and map keyed-by-id
  const [participantsArray, setParticipantsArray] = useState<Participant[]>(initialParticipants || []);
  const participantsById = useMemo(() => {
    const m: Record<string, Participant> = {};
    (participantsArray || []).forEach((p) => {
      if (!p || !p.id) return;
      m[p.id] = p;
    });
    return m;
  }, [participantsArray]);

  // ETAs per participant from TomTom matrix polling
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number; distanceMeters: number }>>({});

  // Follow a participant when user clicks Follow
  const [followId, setFollowId] = useState<string | null>(null);

  // origin/destination deduced from Firestore doc (if present) or fallbacks
  const [originState, setOriginState] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationState, setDestinationState] = useState<{ lat: number; lng: number } | null>(null);

  // If no origin/destination from server, use first two participants as fallback
  useEffect(() => {
    if (!originState && participantsArray[0]) {
      setOriginState({ lat: participantsArray[0].lat, lng: participantsArray[0].lng });
    }
    if (!destinationState && participantsArray[1]) {
      setDestinationState({ lat: participantsArray[1].lat, lng: participantsArray[1].lng });
    }
  }, [participantsArray, originState, destinationState]);

  // Reverse geocode friendly names (hook will cache and call /api/reverse-geocode)
  const pickupLat = originState?.lat ?? participantsArray[0]?.lat ?? 12.9716;
  const pickupLng = originState?.lng ?? participantsArray[0]?.lng ?? 77.5946;
  const destLat = destinationState?.lat ?? participantsArray[1]?.lat ?? 12.9750;
  const destLng = destinationState?.lng ?? participantsArray[1]?.lng ?? 77.5990;

  const { name: pickupName, shortName: pickupShort } = useReverseGeocode(pickupLat, pickupLng);
  const { name: destName, shortName: destShort } = useReverseGeocode(destLat, destLng);

  // Format ETA helper
  const formatETA = (s?: number | null) => {
    if (s == null) return '--';
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m`;
  };

  // called by TomTomMapController when ETA polling returns
  const handleParticipantETA = useCallback((id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => {
    setParticipantETAs((prev) => {
      const copy = { ...prev };
      if (data.etaSeconds == null && data.distanceMeters == null) {
        delete copy[id];
      } else {
        copy[id] = { etaSeconds: data.etaSeconds ?? 0, distanceMeters: data.distanceMeters ?? 0 };
      }
      return copy;
    });
  }, []);

  /* -----------------------------------------
     Firestore subscription: robust/dynamic init
     - tries to import an existing client module (src/firebase/clientApp or src/lib/firebase)
     - falls back to initializing firebase using NEXT_PUBLIC_* env vars (client-side only)
     - subscribes to doc('trips', tripId) and expects { participants: [...] , pickup?, destination? }
     ----------------------------------------- */
  useEffect(() => {
    if (!tripId) return;

    let unsub: (() => void) | null = null;
    let mounted = true;

    (async () => {
      try {
        // 1) Try to use an existing client export if available
        // This file path is common in many repos. If you maintain a custom path, the dynamic import may fail and we'll fallback.
        let firestore: any = null;
        try {
          // try known project export paths
          const mod = await import('@/firebase/client').catch(() => null) || await import('@/lib/firebaseClient').catch(() => null);
          if (mod) {
            // Accept either named exports or default
            // If the module exports 'firestore' or 'db' prefer them, otherwise try to call getFirestore(mod.app)
            if (mod.firestore) {
              firestore = mod.firestore;
            } else if (mod.db) {
              firestore = mod.db;
            } else if (mod.default && mod.default.firestore) {
              firestore = mod.default.firestore;
            } else if (mod.getFirestore && mod.app) {
              firestore = mod.getFirestore(mod.app);
            } else if (mod.getFirebaseInstances) {
              const instances = mod.getFirebaseInstances();
              if (instances && instances.firestore) firestore = instances.firestore;
            }
          }
        } catch (e) {
          // ignore and fallback to client-side init below
        }

        // 2) If we still don't have firestore, initialize using Firebase JS SDK (client)
        if (!firestore) {
          try {
            // dynamic import to keep SDK out of server bundles
            const firebaseAppModule = await import('firebase/app').catch(() => null);
            const firebaseFirestoreModule = await import('firebase/firestore').catch(() => null);
            if (!firebaseAppModule || !firebaseFirestoreModule) {
              console.warn('Firebase client SDK not available; cannot subscribe to Firestore automatically.');
              return;
            }
            const { initializeApp, getApps } = await import('firebase/app');
            const { getFirestore } = await import('firebase/firestore');

            // use env vars to initialize (ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID etc are set)
            const conf = {
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
              authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
              // other optional fields: storageBucket, messagingSenderId
            };

            if (!getApps().length) {
              initializeApp(conf);
            }
            firestore = getFirestore();
          } catch (e) {
            console.warn('Failed to initialize Firebase client dynamically:', (e as any)?.message || e);
            return;
          }
        }

        if (!firestore) {
          console.warn('Firestore instance unavailable; skipping trip subscription.');
          return;
        }

        // now subscribe to the trips/{tripId} doc
        const { doc, onSnapshot } = await import('firebase/firestore').catch(() => ({ doc: null, onSnapshot: null }));
        if (!doc || !onSnapshot) {
          console.warn('firebase/firestore did not export expected functions; subscription unavailable.');
          return;
        }

        const tripDocRef = doc(firestore, 'trips', tripId);
        const snapUnsub = onSnapshot(
          tripDocRef,
          (snap: any) => {
            if (!mounted) return;
            const data = snap.exists ? snap.data() : null;
            if (!data) {
              // if doc missing, keep current participants or clear depending on preference
              // setParticipantsArray([]);
              return;
            }

            // Expect participants array
            const list = Array.isArray(data.participants) ? data.participants : [];
            // Normalize items to { id, name, lat, lng }
            const normalized: Participant[] = list
              .map((it: any) => {
                if (!it) return null;
                // if stored as map keyed by id, convert to array
                if (it.id && (it.lat != null || it.lng != null || it.coords)) {
                    const lat = it.lat ?? it.coords?.lat;
                    const lng = it.lng ?? it.coords?.lng;
                    if (lat != null && lng != null) {
                         return { id: String(it.id), name: it.name ?? undefined, lat: Number(lat), lng: Number(lng) } as Participant;
                    }
                }
                // if stored as { uid: { lat, lng, name } } handle that case
                return null;
              })
              .filter(Boolean) as Participant[];

            // If participants stored as object map instead of array, try conversion
            if (normalized.length === 0 && typeof data.participants === 'object' && !Array.isArray(data.participants)) {
              const arr: Participant[] = [];
              Object.entries(data.participants).forEach(([k, v]) => {
                const maybe = v as any;
                if (!maybe) return;
                const lat = maybe.lat ?? maybe.latitude ?? maybe.coords?.lat ?? maybe.location?.lat;
                const lng = maybe.lng ?? maybe.longitude ?? maybe.coords?.lng ?? maybe.location?.lng;
                if ((lat != null || lng != null) || maybe.id) {
                  arr.push({
                    id: maybe.id ? String(maybe.id) : String(k),
                    name: maybe.name ?? maybe.displayName ?? undefined,
                    lat: Number(lat ?? 0),
                    lng: Number(lng ?? 0),
                  });
                }
              });
              setParticipantsArray(arr);
            } else {
              setParticipantsArray(normalized);
            }

            // pickup / destination updates if present
            if (data.pickup && (data.pickup.lat != null || data.pickup.lng != null)) {
              setOriginState({ lat: Number(data.pickup.lat), lng: Number(data.pickup.lng) });
            }
            if (data.destination && (data.destination.lat != null || data.destination.lng != null)) {
              setDestinationState({ lat: Number(data.destination.lat), lng: Number(data.destination.lng) });
            }
          },
          (err: any) => {
            console.warn('Trip subscription error', err);
          }
        );

        unsub = () => {
          try {
            snapUnsub();
          } catch (e) {}
        };
      } catch (e) {
        console.warn('TripRoomClient: firestore subscription failed', (e as any)?.message || e);
      }
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  /* -----------------------------------------
     Render UI: TomTomMapController + sidebar
     ----------------------------------------- */
  return (
    <div className={className || 'w-full h-full flex'} style={{ minHeight: 360 }}>
      <div style={{ flex: 1, minHeight: 360 }}>
        <TomTomMapController
          participants={participantsById}
          computeRoutes={true}
          onParticipantETA={handleParticipantETA}
          followId={followId}
          initialCenter={{ lat: pickupLat, lng: pickupLng }}
          initialZoom={13}
          origin={originState ?? { lat: pickupLat, lng: pickupLng }}
          destination={destinationState ?? { lat: destLat, lng: destLng }}
        />
      </div>

      <aside style={{ width: 360, borderLeft: '1px solid #eee', padding: 12, background: '#fff', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Trip</h3>
          <div style={{ fontSize: 12, color: '#666' }}>{participantsArray.length} participants</div>
        </div>

        <section style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>Pickup</div>
          <div style={{ fontSize: 13, color: '#444' }}>{pickupName ?? pickupShort ?? `${(originState ?? { lat: pickupLat }).lat.toFixed(5)}, ${(originState ?? { lng: pickupLng }).lng.toFixed(5)}`}</div>
        </section>

        <section style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>Destination</div>
          <div style={{ fontSize: 13, color: '#444' }}>{destName ?? destShort ?? `${(destinationState ?? { lat: destLat }).lat.toFixed(5)}, ${(destinationState ?? { lng: destLng }).lng.toFixed(5)}`}</div>
        </section>

        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Participants</div>
          {participantsArray.length === 0 ? (
            <div style={{ color: '#777' }}>No participants yet</div>
          ) : (
            participantsArray.map((p) => {
              const eta = participantETAs[p.id];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, marginBottom: 8, borderRadius: 8, border: '1px solid #f3f3f3' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1E90FF' }}>
                    {(p.name || '??').slice(0, 2).toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.name || 'Unnamed'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{eta ? `${Math.round(eta.distanceMeters)} m • ${formatETA(eta.etaSeconds)}` : 'ETA —'}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      onClick={() => {
                        setFollowId(p.id);
                        setTimeout(() => setFollowId(null), 3000);
                      }}
                      style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #e6e6e6', background: '#fff', cursor: 'pointer' }}
                    >
                      Follow
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Book a ride</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <RideButton provider="uber" pickup={{ lat: (originState ?? { lat: pickupLat }).lat, lng: (originState ?? { lng: pickupLng }).lng, name: pickupName ?? pickupShort }} drop={{ lat: (destinationState ?? { lat: destLat }).lat, lng: (destinationState ?? { lng: destLng }).lng, name: destName ?? destShort }}>
              Uber
            </RideButton>
            <RideButton provider="ola" pickup={{ lat: (originState ?? { lat: pickupLat }).lat, lng: (originState ?? { lng: pickupLng }).lng, name: pickupName ?? pickupShort }} drop={{ lat: (destinationState ?? { lat: destLat }).lat, lng: (destinationState ?? { lng: destLng }).lng, name: destName ?? destShort }}>
              Ola
            </RideButton>
            <RideButton provider="rapido" pickup={{ lat: (originState ?? { lat: pickupLat }).lat, lng: (originState ?? { lng: pickupLng }).lng, name: pickupName ?? pickupShort }} drop={{ lat: (destinationState ?? { lat: destLat }).lat, lng: (destinationState ?? { lng: destLng }).lng, name: destName ?? destShort }}>
              Rapido
            </RideButton>
            <RideButton provider="transit" pickup={{ lat: (originState ?? { lat: pickupLat }).lat, lng: (originState ?? { lng: pickupLng }).lng }} drop={{ lat: (destinationState ?? { lat: destLat }).lat, lng: (destinationState ?? { lng: destLng }).lng }}>
              Transit
            </RideButton>
          </div>
        </div>
      </aside>
    </div>
  );
}

    
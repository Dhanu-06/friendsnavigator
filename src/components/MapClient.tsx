'use client';

import React, { useEffect, useRef, useState } from 'react';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import type { Participant, Location } from '@/lib/types';

type FriendLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type MapClientProps = {
  center?: { lat: number; lng: number };
  zoom?: number;
  participants?: Participant[];
  locations?: Record<string, Location>;
};

export default function MapClient({
  center = { lat: 12.9716, lng: 77.5946 }, // Bangalore default
  zoom = 12,
  participants = [],
  locations = {},
}: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 1️⃣ Init TomTom map
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!mapContainerRef.current) return;

    // --- TEMPORARY FIX & DEBUGGING ---
    // Using a hardcoded key as a fallback to get the map working in environments where .env.local might not be picked up.
    // The proper fix is to ensure NEXT_PUBLIC_TOMTOM_API_KEY is in a .env.local file in the workspace root.
    console.log('TT KEY IN BROWSER:', process.env.NEXT_PUBLIC_TOMTOM_API_KEY);
    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY ?? 'wAMXwpHDPRmHAeJ7OTyyfqYFM20HE4IF';
    // ------------------------------------

    if (!apiKey) {
      const msg =
        'TomTom API key missing. Add NEXT_PUBLIC_TOMTOM_API_KEY to .env.local and restart `npm run dev`.';
      console.error(msg);
      setError(msg);
      return;
    }

    let cancelled = false;
    let map: any;

    (async () => {
      try {
        const tt = await import('@tomtom-international/web-sdk-maps');

        if (!mapContainerRef.current || cancelled) return;

        map = tt.map({
          key: apiKey,
          container: mapContainerRef.current,
          center: [center.lng, center.lat], // TomTom expects [lng, lat]
          zoom,
        });

        // optional zoom controls
        // @ts-ignore
        map.addControl(new tt.NavigationControl());

        mapInstanceRef.current = map;
        setIsReady(true);
        setError(null);
      } catch (err: any) {
        console.error('TomTom map init error:', err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : JSON.stringify(err);
        setError(`Map failed to load: ${msg}`);
      }
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
    };
  }, [center.lat, center.lng, zoom]);

  // 2️⃣ Add / update friend markers when map and friends are ready
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReady) return;

    const friends: FriendLocation[] = participants
        .map(p => {
            const loc = locations[p.id];
            if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
            return {
                id: p.id,
                name: p.name,
                lat: loc.lat,
                lng: loc.lng,
            }
        })
        .filter((f): f is FriendLocation => f !== null);

    (async () => {
      const tt = await import('@tomtom-international/web-sdk-maps');

      // clear previous markers
      // @ts-ignore
      if (map.__friendsMarkers) {
        // @ts-ignore
        map.__friendsMarkers.forEach((m: any) => m.remove());
      }
      // @ts-ignore
      map.__friendsMarkers = [];

      friends.forEach((friend) => {
        const marker = new tt.Marker()
          .setLngLat([friend.lng, friend.lat])
          .setPopup(
            new tt.Popup({ offset: 30 }).setHTML(
              `<div style="font-size:12px;"><strong>${friend.name}</strong></div>`
            )
          )
          .addTo(map);

        // @ts-ignore
        map.__friendsMarkers.push(marker);
      });

      // fit bounds if we have any friends
      if (friends.length > 0) {
        const lats = friends.map((f) => f.lat);
        const lngs = friends.map((f) => f.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const bounds: [[number, number], [number, number]] = [
          [minLng, minLat],
          [maxLng, maxLat],
        ];
        map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
      }
    })();
  }, [participants, locations, isReady]);

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border-b border-red-200">
          <strong>Map error:</strong> {error}
        </div>
      )}
      {!error && !isReady && (
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-slate-600">
            Loading TomTom map…
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" style={{ display: isReady ? 'block' : 'none' }} />
    </div>
  );
}

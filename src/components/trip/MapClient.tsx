'use client';

import React, { useEffect, useRef, useState } from 'react';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

type FriendLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type MapClientProps = {
  center?: { lat: number; lng: number };
  zoom?: number;
  friends?: FriendLocation[];
};

export default function MapClient({
  center = { lat: 12.9716, lng: 77.5946 }, // Bangalore default
  zoom = 12,
  friends = [],
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
    if (!map || !isReady || !friends) return;

    (async () => {
      const tt = await import('@tomtom-international/web-sdk-maps');
      // @ts-ignore
      if (map.__friendsMarkers) {
        // @ts-ignore
        map.__friendsMarkers.forEach((m: any) => m.remove());
      }
      // @ts-ignore
      map.__friendsMarkers = [];

      friends.forEach((friend) => {
        const markerEl = document.createElement('div');
        markerEl.className = 'w-10 h-10 bg-white rounded-full border-2 border-primary shadow-md flex items-center justify-center overflow-hidden';
        markerEl.innerHTML = `<img src="https://i.pravatar.cc/150?u=${friend.id}" alt="${friend.name}" class="w-full h-full object-cover">`;

        const marker = new tt.Marker({element: markerEl})
          .setLngLat([friend.lng, friend.lat])
          .setPopup(
            new tt.Popup({ offset: 30 }).setHTML(
              `<div style="font-weight: bold;">${friend.name}</div>`
            )
          )
          .addTo(map);

        // @ts-ignore
        map.__friendsMarkers.push(marker);
      });

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
  }, [friends, isReady]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-muted relative">
      {error && (
        <div className="absolute inset-0 bg-red-50 text-red-700 flex flex-col items-center justify-center p-4 z-10">
          <h3 className="font-bold">Map Error</h3>
          <p className="text-sm text-center">{error}</p>
        </div>
      )}
      {!error && !isReady && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <p className="text-muted-foreground">Loading Map...</p>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}

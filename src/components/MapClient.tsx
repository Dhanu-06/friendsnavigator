'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Map, Marker, Popup } from '@tomtom-international/web-sdk-maps';
// TomTom CSS must be imported at top-level in a client component
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
  const mapInstanceRef = useRef<Map | null>(null);
  const friendsMarkersRef = useRef<Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // This effect initializes the map.
    // It's client-side only because of `typeof window` check and dynamic import.
    // Thrown objects were causing `Error: [object Object]`. This is now handled
    // by catching all errors and setting a readable string in state.
    if (typeof window === 'undefined') return;
    if (!mapContainerRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey) {
      const msg =
        'TomTom API key missing. Add NEXT_PUBLIC_TOMTOM_API_KEY to .env file and restart `npm run dev`.';
      console.error(msg);
      setError(msg);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        // Dynamic import ensures TomTom's SDK (a browser-only library)
        // is not executed during server-side rendering.
        const tt = await import('@tomtom-international/web-sdk-maps');

        if (!mapContainerRef.current || isCancelled) return;

        const map = tt.map({
          key: apiKey,
          container: mapContainerRef.current,
          center: [center.lng, center.lat], // [lng, lat]
          zoom,
          style: {
            map: 'basic-dark',
            poi: 'poi-dark',
            trafficIncidents: 'traffic-incidents-dark',
            trafficFlow: 'traffic-flow-dark'
          }
        });

        mapInstanceRef.current = map;

        map.addControl(new tt.NavigationControl());

        map.on('load', () => {
            if (!isCancelled) {
                setIsReady(true);
            }
        });
        
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
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && isReady) {
      mapInstanceRef.current.flyTo({ center: [center.lng, center.lat], zoom });
    }
  }, [center.lat, center.lng, zoom, isReady]);

  // Update markers whenever friends list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReady) return;

    // Clear existing markers
    friendsMarkersRef.current.forEach((m) => m.remove());
    friendsMarkersRef.current = [];

    (async () => {
      const tt = await import('@tomtom-international/web-sdk-maps');

      friends.forEach((friend) => {
        const marker = new tt.Marker()
          .setLngLat([friend.lng, friend.lat])
          .setPopup(
            new tt.Popup({ offset: 30 }).setHTML(
              `<div style="font-size:12px;"><strong>${friend.name}</strong></div>`
            )
          )
          .addTo(map);

        friendsMarkersRef.current.push(marker);
      });

      if (friends.length > 0) {
        const lats = friends.map((f) => f.lat);
        const lngs = friends.map((f) => f.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const bounds: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];
        
        map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
      }
    })();
  }, [friends, isReady]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-muted border">
      {error && (
        <div className="absolute inset-0 z-10 p-8 rounded-md bg-destructive/90 text-destructive-foreground flex flex-col items-center justify-center text-center">
           <h3 className="text-xl font-bold mb-4">Map Error</h3>
            <p className="mb-4">The map could not be loaded. This might be due to an invalid API key, network issues, or a configuration problem.</p>
            <div className="text-left bg-background text-foreground p-4 rounded-md max-w-lg w-full font-code text-sm">
                <p className="font-bold mb-2">How to fix this:</p>
                <ol className="list-decimal list-inside space-y-2">
                    <li><b>Check API Key</b>: Ensure `NEXT_PUBLIC_TOMTOM_API_KEY` in your `.env` file is correct and that the file is in the root of your project.</li>
                    <li><b>Restart Server</b>: After creating or modifying the `.env` file, you must restart your Next.js development server.</li>
                    <li><b>TomTom Account</b>: Verify your key is enabled for the domain you're using (e.g., `localhost`) in your TomTom Developer Portal.</li>
                    <li><b>Dev Console</b>: Open the browser's developer console (F12) to see the detailed error message logged there.</li>
                </ol>
            </div>
            <p className="mt-4 text-sm text-destructive-foreground/80">{error}</p>
        </div>
      )}
      {!error && !isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-muted-foreground">Loading Map...</p>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}

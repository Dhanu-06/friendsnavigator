'use client';

import React, { useEffect, useRef, useState } from 'react';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

type FriendLocation = { id: string; name: string; lat: number; lng: number; mode?: string, avatarUrl?: string };

export default function MapClient({
  center = { lat: 13.0105, lng: 77.5540 },
  zoom = 12,
  friends = []
}: { center?: {lat:number,lng:number}, zoom?:number, friends?: FriendLocation[] }) {
  const mapRef = useRef<HTMLDivElement|null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [error, setError] = useState<string|null>(null);
  const [ready, setReady] = useState(false);
  const markersRef = useRef<any>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey) {
      const m = 'TomTom API key missing. Add NEXT_PUBLIC_TOMTOM_API_KEY to .env.local and restart dev.';
      console.error(m);
      setError(m);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const tt = await import('@tomtom-international/web-sdk-maps');
        if (cancelled || !mapRef.current) return;
        const map = tt.map({
          key: apiKey,
          container: mapRef.current,
          center: [center.lng, center.lat],
          zoom
        });
        // @ts-ignore
        map.addControl(new tt.NavigationControl());
        mapInstanceRef.current = map;
        setReady(true);
      } catch (err:any) {
        console.error('TomTom map init error:', err);
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        setError(`Map failed to load: ${msg}`);
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready) return;

    (async () => {
        const tt = await import('@tomtom-international/web-sdk-maps');
        const currentMarkerIds = Object.keys(markersRef.current);
        const friendIds = friends.map(f => f.id);

        // Remove markers for friends who are no longer in the list
        currentMarkerIds.forEach(id => {
            if (!friendIds.includes(id)) {
                markersRef.current[id].marker.remove();
                delete markersRef.current[id];
            }
        });
        
        friends.forEach(f=>{
            if (typeof f.lat !== 'number' || typeof f.lng !== 'number') return;
            
            const lngLat: [number, number] = [f.lng, f.lat];

            if (markersRef.current[f.id]) {
                // Update existing marker
                markersRef.current[f.id].marker.setLngLat(lngLat);
            } else {
                // Create new marker
                const markerEl = document.createElement('div');
                markerEl.className = 'w-10 h-10 bg-white rounded-full border-2 border-primary shadow-md flex items-center justify-center overflow-hidden';
                const avatar = f.avatarUrl || `https://i.pravatar.cc/150?u=${f.id}`;
                markerEl.innerHTML = `<img src="${avatar}" alt="${f.name}" class="w-full h-full object-cover">`;

                const marker = new tt.Marker({element: markerEl})
                    .setLngLat(lngLat)
                    .addTo(map);
                
                const popup = new tt.Popup({offset:30}).setHTML(`<strong>${f.name}</strong>`);
                marker.setPopup(popup);

                markersRef.current[f.id] = { marker, popup };
            }
        });

        if (friends.length > 0) {
            const validFriends = friends.filter(f => typeof f.lat === 'number' && typeof f.lng === 'number');
            if (validFriends.length > 0) {
                const lats = validFriends.map(x=>x.lat), lngs = validFriends.map(x=>x.lng);
                const bounds: [[number, number], [number, number]] = [[Math.min(...lngs), Math.min(...lats)],[Math.max(...lngs), Math.max(...lats)]];
                try { map.fitBounds(bounds, {padding:80, maxZoom:16}); } catch(e){/* ignore */ }
            }
        }
    })();
  }, [friends, ready]);

  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden border bg-muted relative">
      {error && <div className="absolute inset-0 z-10 p-2 text-sm text-red-700 bg-red-50 flex items-center justify-center text-center">{error}</div>}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}

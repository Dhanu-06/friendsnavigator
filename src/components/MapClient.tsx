
'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Map, Marker, NavigationControl } from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

type MapClientProps = {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: { lat: number; lng: number; title: string, id: string }[];
};

export default function MapClient({ 
  center = { lat: 12.9716, lng: 77.5946 }, 
  zoom = 12,
  markers = []
}: MapClientProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<Map | null>(null);
  const markerRefs = useRef<Record<string, Marker>>({});
  const [error, setError] = useState<string | null>(null);
  const [isMapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey) {
      setError('TomTom API key is missing. Please add NEXT_PUBLIC_TOMTOM_API_KEY to your .env.local file and restart the server.');
      console.error('No NEXT_PUBLIC_TOMTOM_API_KEY found in .env.local');
      return;
    }

    if (!mapRef.current) return;
    
    // Prevent re-initialization
    if (mapObj.current) return; 

    // Dynamically import the TomTom library
    import('@tomtom-international/web-sdk-maps').then(tt => {
        try {
            const map = tt.map({
                key: apiKey,
                container: mapRef.current!,
                center: [center.lng, center.lat],
                zoom,
                style: {
                    map: 'basic-dark',
                    poi: 'poi-dark',
                    trafficIncidents: 'traffic-incidents-dark',
                    trafficFlow: 'traffic-flow-dark'
                }
            });
            
            map.addControl(new (tt as any).NavigationControl(), 'top-left');
            mapObj.current = map;
            
            map.on('load', () => {
                setMapInitialized(true);
            });

        } catch (err) {
            console.error('TomTom Map init error:', err);
            setError('Map initialization failed. Check the console for details.');
        }
    });

    return () => {
      mapObj.current?.remove();
      mapObj.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Update center when prop changes
  useEffect(() => {
    if (mapObj.current && center) {
      mapObj.current.flyTo({ center: [center.lng, center.lat], zoom });
    }
  }, [center, zoom]);


  // Update markers when they change
  useEffect(() => {
    if (!mapObj.current || !isMapInitialized) return;
    const map = mapObj.current;
    
    import('@tomtom-international/web-sdk-maps').then(tt => {
        const currentMarkerIds = Object.keys(markerRefs.current);
        const newMarkerIds = markers.map(m => m.id);

        // Remove markers that are no longer in the props
        currentMarkerIds.forEach(markerId => {
        if (!newMarkerIds.includes(markerId)) {
            markerRefs.current[markerId].remove();
            delete markerRefs.current[markerId];
        }
        });

        // Add new or update existing markers
        markers.forEach(markerInfo => {
        const { lat, lng, title, id } = markerInfo;
        const lngLat: [number, number] = [lng, lat];
        
        if (markerRefs.current[id]) {
            // If marker exists, just update its position
            markerRefs.current[id].setLngLat(lngLat);
        } else {
            // Otherwise, create a new marker
            const marker = new tt.Marker()
            .setLngLat(lngLat)
            .addTo(map);

            const popup = new tt.Popup({ offset: 35 }).setText(title);
            marker.setPopup(popup);

            markerRefs.current[id] = marker;
        }
        });
    });

  }, [markers, isMapInitialized]);


  return (
    <div style={{ height: '100%', width: '100%', minHeight: 400, position: 'relative' }} className="bg-muted rounded-lg border">
      {error && (
        <div className="absolute inset-0 z-10 p-8 rounded-md bg-destructive/90 text-destructive-foreground flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold mb-4">TomTom Maps Error</h3>
            <p className="mb-4">The map could not be loaded. This is usually caused by a missing or invalid TomTom API key.</p>
            <div className="text-left bg-background text-foreground p-4 rounded-md max-w-lg w-full font-code text-sm">
                <p className="font-bold mb-2">To fix this:</p>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Go to the <b className="text-primary">TomTom Developer Portal</b> and create a free account.</li>
                    <li>Create a new application and get your **API Key**.</li>
                    <li>Create a <b className="text-primary">.env.local</b> file in your project's root directory.</li>
                    <li>Add your API key to the file: <br /><code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_TOMTOM_API_KEY=YOUR_KEY_HERE</code></li>
                    <li>In the TomTom Developer Portal, make sure your key is enabled for the domains you're using (e.g. `localhost`).</li>
                    <li><b className="text-primary">Restart your development server</b> after editing the <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file.</li>
                </ol>
            </div>
            <p className="mt-4 text-sm text-destructive-foreground/80">{error}</p>
        </div>
      )}
      <div ref={mapRef} id="map" style={{ width: '100%', height: '100%' }} />
       {!isMapInitialized && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-muted-foreground">Loading Map...</p>
        </div>
      )}
    </div>
  );
}

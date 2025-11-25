'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Map, Marker, Popup } from '@tomtom-international/web-sdk-maps';
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
  // Use a state to hold the map instance to ensure it's available for cleanup
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const markerRefs = useRef<Record<string, Marker>>({});
  const [error, setError] = useState<string | null>(null);
  const [isMapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    // TomTom SDK must only be run in the browser, as it relies on the 'window' object.
    // This effect hook ensures this code does not run during server-side rendering (SSR).
    if (typeof window === 'undefined' || !mapRef.current) {
        return;
    }

    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey) {
      const msg = 'TomTom API key is missing. Please add NEXT_PUBLIC_TOMTOM_API_KEY to your .env file and restart the dev server.';
      console.error(msg);
      setError(msg);
      return;
    }

    let map: Map;

    // Use an async IIFE (Immediately Invoked Function Expression) to handle the dynamic import
    (async () => {
        try {
            // Dynamically import the TomTom library only on the client-side
            const tt = await import('@tomtom-international/web-sdk-maps');

            // If a map instance already exists, do not re-initialize
            if (mapInstance) return;

            map = tt.map({
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
            
            map.on('load', () => {
                setMapInitialized(true);
            });

            setMapInstance(map); // Save the map instance to state

        } catch (err) {
            // Throwing a raw object (like 'err' here) can cause a generic '[object Object]' error in Next.js.
            // By catching it, we can log the full object for debugging and display a user-friendly string.
            console.error('TomTom Map initialization error:', err);
            const msg =
              err instanceof Error
                ? err.message
                : typeof err === 'string'
                ? err
                : JSON.stringify(err);
            setError(`Map failed to load: ${msg}`);
        }
    })();

    // Cleanup function to remove the map when the component unmounts
    return () => {
      // Use the map instance from state for cleanup
      if (mapInstance) {
        mapInstance.remove();
        setMapInstance(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Update center when prop changes
  useEffect(() => {
    if (mapInstance && center) {
      mapInstance.flyTo({ center: [center.lng, center.lat], zoom });
    }
  }, [center, zoom, mapInstance]);


  // Update markers when they change
  useEffect(() => {
    if (!mapInstance || !isMapInitialized) return;
    
    // Asynchronously import the SDK again to use its classes like Marker and Popup
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
                    .addTo(mapInstance);

                const popup = new tt.Popup({ offset: 35 }).setText(title);
                marker.setPopup(popup);

                markerRefs.current[id] = marker;
            }
        });
    });

  }, [markers, isMapInitialized, mapInstance]);


  return (
    <div style={{ height: '100%', width: '100%', minHeight: 400, position: 'relative' }} className="bg-muted rounded-lg border">
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
      <div ref={mapRef} id="map" style={{ width: '100%', height: '100%' }} />
       {!isMapInitialized && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-muted-foreground">Loading Map...</p>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';

type MapClientProps = {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: { lat: number; lng: number; title: string }[];
};

export default function MapClient({ 
  center = { lat: 12.9716, lng: 77.5946 }, 
  zoom = 12,
  markers = []
}: MapClientProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setError('The Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file and restart the server.');
      console.error('No NEXT_PUBLIC_GOOGLE_MAPS_API_KEY found in .env.local');
      return;
    }

    const existing = document.getElementById('gmaps-script') as HTMLScriptElement | null;
    
    const initMap = () => {
      try {
        if (!mapRef.current || !(window as any).google?.maps) return;
        
        const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
          center,
          zoom,
           // Dark mode styles
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
            { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
            { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
            { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
            { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
            { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
          ],
          gestureHandling: 'greedy',
          disableDefaultUI: true,
        });

        markers.forEach(markerInfo => {
           new (window as any).google.maps.Marker({
            position: { lat: markerInfo.lat, lng: markerInfo.lng },
            map: mapInstance,
            title: markerInfo.title,
          });
        });
        
        setMapInitialized(true);

      } catch (err) {
        console.error('Map init error:', err);
        setError('Map initialization failed — see console.');
      }
    };

    if (!existing) {
      const script = document.createElement('script');
      script.id = 'gmaps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        setError('Google Maps script failed to load. Check the browser console for an "InvalidKeyMapError" or network errors, and verify your API key settings in the Google Cloud Console.');
      };

      script.onload = () => {
        initMap();
      };

      document.head.appendChild(script);
    } else {
      if ((window as any).google && (window as any).google.maps) {
        initMap();
      } else {
        existing.addEventListener('load', initMap);
      }
    }

    return () => {
      // Clean up the event listener if the component unmounts
      if (existing) {
        existing.removeEventListener('load', initMap);
      }
    };
  }, [center, zoom, markers]);

  return (
    <div style={{ height: '100%', width: '100%', minHeight: 400, position: 'relative' }} className="bg-muted rounded-lg border">
      {error && (
        <div className="absolute inset-0 z-10 p-8 rounded-md bg-destructive/90 text-destructive-foreground flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold mb-4">Google Maps Error</h3>
            <p className="mb-4">The map could not be loaded. This is usually caused by a missing or invalid Google Maps API key.</p>
            <div className="text-left bg-background text-foreground p-4 rounded-md max-w-lg w-full font-code text-sm">
                <p className="font-bold mb-2">To fix this:</p>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Create a <b className="text-primary">.env.local</b> file in your project's root directory.</li>
                    <li>Add your API key to the file: <br /><code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE</code></li>
                    <li>In Google Cloud Console, ensure the <b className="text-primary">"Maps JavaScript API"</b> is enabled.</li>
                    <li>Under <b className="text-primary">Application restrictions</b>, add <code className="bg-muted px-1 py-0.5 rounded">http://localhost:3000/*</code> to the "HTTP referrers".</li>
                    <li>Ensure <b className="text-primary">billing is enabled</b> for your Google Cloud project.</li>
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


'use client';

import React, { useEffect, useRef, useState } from 'react';

type Participant = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
};

type RouteCoords = Array<{ latitude: number; longitude: number }>;

type Props = {
  participants: Record<string, Participant>; // keyed by id
  computeRoutes?: boolean; // enable ETA polling + route drawing
  onParticipantETA?: (id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => void;
  followId?: string | null; // id of participant to follow / center on
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  origin?: { lat: number; lng: number } | null; // route origin (optional)
  destination?: { lat: number; lng: number } | null; // route destination (optional)
  onMapReady?: (map: any) => void;
  onRouteReady?: (coords: RouteCoords, summary: { travelTimeSeconds: number | null; distanceMeters: number | null; }) => void;
};

const TOMTOM_CSS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';
const TOMTOM_JS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';

// Use client-visible key only for map tiles. Prefer server-side key for routing (we call /api/route).
const TOMTOM_KEY_CLIENT = (process.env.NEXT_PUBLIC_TOMTOM_KEY as string) || '';

export default function TomTomMapController({
  participants,
  computeRoutes = false,
  onParticipantETA,
  followId = null,
  initialCenter = { lat: 12.9716, lng: 77.5946 },
  initialZoom = 12,
  className,
  origin = null,
  destination = null,
  onMapReady,
  onRouteReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const rafRef = useRef<Map<string, number>>(new Map());
  const pollTimerRef = useRef<number | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [mapInitError, setMapInitError] = useState<string | null>(null);


  /* --------------------------
     Load TomTom SDK (client-only)
     -------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const win = window as any;
    if (win.tt) {
        setSdkReady(true);
        return;
    }

    // Inject CSS
    if (!document.querySelector('link[data-tt-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = TOMTOM_CSS;
      link.setAttribute('data-tt-css', '1');
      document.head.appendChild(link);
    }
    
    // If script already injected, wait for load
    const existingScript = document.querySelector('script[data-tt-sdk]');
    if (existingScript) {
      const loadListener = () => setSdkReady(true);
      existingScript.addEventListener('load', loadListener);
      return () => existingScript.removeEventListener('load', loadListener);
    }

    // Inject script
    const s = document.createElement('script');
    s.src = TOMTOM_JS;
    s.async = true;
    s.setAttribute('data-tt-sdk', '1');
    s.onload = () => setSdkReady(true);
    s.onerror = () => {
      console.error('Failed to load TomTom SDK script');
      setMapInitError('Failed to load TomTom SDK script. Check your internet connection and ad-blocker.');
    };
    document.body.appendChild(s);

  }, []);

  /* --------------------------
     Initialize map
     -------------------------- */
  useEffect(() => {
    if (!sdkReady || !containerRef.current || mapRef.current) return;
    
    const tt = (window as any).tt;
    if (!tt) {
      console.error('TomTom SDK not available on window.tt, though sdkReady was true.');
      return;
    }

    try {
      if (!TOMTOM_KEY_CLIENT) {
        setMapInitError("NEXT_PUBLIC_TOMTOM_KEY is not set. Please add it to your .env file to display the map.");
        return;
      }
      const map = tt.map({
        key: TOMTOM_KEY_CLIENT,
        container: containerRef.current,
        center: [initialCenter.lng, initialCenter.lat],
        zoom: initialZoom,
      });
      map.addControl(new tt.NavigationControl());
      mapRef.current = map;
      if (onMapReady) onMapReady(map);
    } catch (e: any) {
      console.error('TomTom map init error', e);
      setMapInitError(e.message || 'An unknown error occurred during map initialization.');
    }
  }, [sdkReady, initialCenter.lat, initialCenter.lng, initialZoom, onMapReady]);


  /* --------------------------
     Clean up map & markers on unmount
     -------------------------- */
  useEffect(() => {
    return () => {
      stopPolling();
      rafRef.current.forEach((id) => cancelAnimationFrame(id));
      rafRef.current.clear();
      markersRef.current.forEach((v) => {
        try {
          v.marker.remove();
        } catch (e) {}
      });
      markersRef.current.clear();
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------
     Manage markers: create / update / remove, and animate movement
     -------------------------- */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const tt = (window as any).tt;

    // Build set of existing ids and new ids
    const existingIds = new Set(markersRef.current.keys());
    const incoming = Object.values(participants || {});

    incoming.forEach((p) => {
      existingIds.delete(p.id);
      const entry = markersRef.current.get(p.id);
      if (!entry) {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'tt-participant-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
        el.style.background = '#ffffff';
        el.style.border = '2px solid #1E90FF';
        el.style.fontSize = '12px';
        el.style.fontWeight = '700';
        el.style.color = '#1E90FF';
        el.innerText = (p.name || '?').slice(0, 2).toUpperCase();

        // Create marker & popup
        const marker = new tt.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);

        const popupEl = document.createElement('div');
        popupEl.style.padding = '6px 8px';
        popupEl.style.fontSize = '13px';
        popupEl.innerText = p.name || 'Unknown';

        const popup = new tt.Popup({ offset: 10 }).setDOMContent(popupEl);
        marker.setPopup(popup);

        markersRef.current.set(p.id, {
          marker,
          el,
          popupEl,
          current: { lat: p.lat, lng: p.lng },
          target: undefined as { lat: number; lng: number } | undefined,
        });
      } else {
        // update target
        entry.target = { lat: p.lat, lng: p.lng };
        // update popup label if changed
        if (entry.popupEl && entry.popupEl.innerText !== (p.name || 'Unknown')) {
          entry.popupEl.innerText = p.name || 'Unknown';
        }
      }
    });

    // Remove markers that are no longer present
    existingIds.forEach((id) => {
      const data = markersRef.current.get(id);
      if (data) {
        try {
          data.marker.remove();
        } catch (e) {}
        markersRef.current.delete(id);
        const rafId = rafRef.current.get(id);
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafRef.current.delete(id);
        }
      }
    });

    // Start animation loops for markers that need it
    markersRef.current.forEach((data, id) => {
      if (rafRef.current.get(id)) return; // already animating
      const loop = () => {
        try {
          const { current, target } = data;
          if (target) {
            // interpolate
            const t = 0.15; // smoothing factor: lower = slower, higher = snappier
            const latDiff = target.lat - current.lat;
            const lngDiff = target.lng - current.lng;
            if (Math.abs(latDiff) < 1e-6 && Math.abs(lngDiff) < 1e-6) {
              current.lat = target.lat;
              current.lng = target.lng;
              delete data.target;
              try {
                data.marker.setLngLat([current.lng, current.lat]);
              } catch (e) {}
            } else {
              current.lat += latDiff * t;
              current.lng += lngDiff * t;
              try {
                data.marker.setLngLat([current.lng, current.lat]);
              } catch (e) {}
            }
          }
        } catch (e) {}
        const idRef = requestAnimationFrame(loop);
        rafRef.current.set(id, idRef);
      };
      const idRef = requestAnimationFrame(loop);
      rafRef.current.set(id, idRef);
    });

    // If followId is present, center on that marker
    if (followId && markersRef.current.has(followId)) {
      const d = markersRef.current.get(followId);
      if (d && d.current) {
        try {
          map.easeTo({ center: [d.current.lng, d.current.lat], duration: 700 });
        } catch (e) {}
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, sdkReady, followId]);

  /* --------------------------
     ETA polling (calls /api/matrix-eta every 5s when computeRoutes === true)
     -------------------------- */
  useEffect(() => {
    if (!sdkReady || !mapRef.current) return;

    if (computeRoutes) startPolling();
    else stopPolling();

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeRoutes, sdkReady, JSON.stringify(participants)]);

  function startPolling() {
    if (pollTimerRef.current) return;
    // immediate
    fetchAndDispatchETAs();
    const id = window.setInterval(fetchAndDispatchETAs, 5000);
    pollTimerRef.current = id as unknown as number;
  }
  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current as number);
      pollTimerRef.current = null;
    }
  }

  async function fetchAndDispatchETAs() {
    try {
      const list = Object.values(participants).map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }));
      if (list.length === 0 || !destination) return;

      const res = await fetch('/api/matrix-eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: list, destination }),
      });
      if (!res.ok) {
        console.error("Failed to fetch ETAs:", res.status, await res.text());
        return;
      }
      const json = await res.json().catch(() => null);
      if (!json) return;

      const normalized: Record<string, { etaSeconds: number | null; distanceMeters: number | null }> = {};
      if (json.etas && typeof json.etas === 'object' && !Array.isArray(json.etas)) {
        Object.entries(json.etas).forEach(([id, v]) => {
          if (!v) return;
          const anyV = v as any;
          normalized[id] = {
            etaSeconds: typeof anyV.etaSeconds === 'number' ? anyV.etaSeconds : anyV.durationSeconds ?? anyV.duration ?? null,
            distanceMeters: typeof anyV.distanceMeters === 'number' ? anyV.distanceMeters : anyV.distance ?? null,
          };
        });
      }
      
      Object.entries(normalized).forEach(([id, val]) => {
        try {
          onParticipantETA && onParticipantETA(id, { etaSeconds: val.etaSeconds ?? null, distanceMeters: val.distanceMeters ?? null });
          const data = markersRef.current.get(id);
          if (data && data.popupEl) {
            const baseName = (participants[id] && participants[id].name) || data.popupEl.innerText.split('|', 1)[0].trim();
            const etaText = typeof val.etaSeconds === 'number' ? formatETA(val.etaSeconds) : '--';
            data.popupEl.innerText = `${baseName} | ETA: ${etaText}`;
          }
        } catch (e) {}
      });
    } catch (e) {
      console.error("Error in fetchAndDispatchETAs:", e);
    }
  }

  function formatETA(s: number | null | undefined) {
    if (s == null) return '--';
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m`;
  }

  /* --------------------------
     Route fetching (but not drawing)
     -------------------------- */
  useEffect(() => {
    if (!sdkReady || !mapRef.current) return;
    if (!computeRoutes || !origin || !destination) {
      if (onRouteReady) onRouteReady([], { travelTimeSeconds: null, distanceMeters: null });
      return;
    }
    fetchRoute(origin, destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, computeRoutes, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  async function fetchRoute(originArg: { lat: number; lng: number }, destinationArg: { lat: number; lng: number }) {
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: originArg, destination: destinationArg }),
      });
      if (!res.ok) {
        console.error("Failed to fetch route:", res.status, await res.text());
        if (onRouteReady) onRouteReady([], { travelTimeSeconds: null, distanceMeters: null });
        return;
      }
      const json = await res.json().catch(() => null);
      if (!json || !json.ok || !json.geojson || !Array.isArray((json.geojson as any).coordinates)) {
        console.warn("Invalid route response from API", json);
        if (onRouteReady) onRouteReady([], { travelTimeSeconds: null, distanceMeters: null });
        return;
      }

      // Convert from [lng, lat] to { latitude, longitude } and pass to parent
      const routeCoords: RouteCoords = json.geojson.coordinates.map((c: [number, number]) => ({
        longitude: c[0],
        latitude: c[1],
      }));
      const summary = {
          travelTimeSeconds: json.summary?.travelTimeSeconds ?? null,
          distanceMeters: json.summary?.distanceMeters ?? null,
      };

      if (onRouteReady) onRouteReady(routeCoords, summary);

    } catch (e) {
      console.error("Error in fetchRoute:", e);
      if (onRouteReady) onRouteReady([], { travelTimeSeconds: null, distanceMeters: null });
    }
  }


  /* --------------------------
     Render
     -------------------------- */
  const showLoading = !sdkReady && !mapInitError;
  const showError = !!mapInitError;

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative', background: '#f0f2f5' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', opacity: showError ? 0.3 : 1 }} />
      {showLoading && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            fontSize: 14, color: '#333'
          }}
        >
          Loading map...
        </div>
      )}
       {showError && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, textAlign: 'center'
          }}
        >
           <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: 0, color: '#d9534f' }}>Map Error</h3>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>{mapInitError}</p>
           </div>
        </div>
      )}
    </div>
  );
}

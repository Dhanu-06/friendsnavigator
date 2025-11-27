'use client';

import React, { useEffect, useRef, useState } from 'react';

type Participant = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
};

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
};

const TOMTOM_CSS = 'https://api.tomtom.com/maps-sdk-for-web/6.x/6.31.0/maps/maps.css';
const TOMTOM_JS = 'https://api.tomtom.com/maps-sdk-for-web/6.x/6.31.0/maps/maps-web.min.js';

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
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const rafRef = useRef<Map<string, number>>(new Map());
  const pollTimerRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  // IDs for route source / layer
  const ROUTE_SOURCE_ID = 'tt-route-source';
  const ROUTE_LAYER_ID = 'tt-route-layer';

  /* --------------------------
     Load TomTom SDK (client-only)
     -------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;

    // Inject CSS
    if (!document.querySelector('link[data-tt-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = TOMTOM_CSS;
      link.setAttribute('data-tt-css', '1');
      document.head.appendChild(link);
    }

    // If SDK already present, init immediately
    const win = window as any;
    if (win.tt) {
      initMap();
      return;
    }

    // If script already injected, wait for load
    const existingScript = document.querySelector('script[data-tt-sdk]');
    if (existingScript) {
      existingScript.addEventListener('load', initMap);
      return;
    }

    // Inject script
    const s = document.createElement('script');
    s.src = TOMTOM_JS;
    s.async = true;
    s.setAttribute('data-tt-sdk', '1');
    s.onload = () => initMap();
    s.onerror = () => {
      console.error('Failed to load TomTom SDK script');
    };
    document.body.appendChild(s);

    return () => {
      // nothing to cleanup for injected script or css (we keep them)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current]);

  /* --------------------------
     Initialize map
     -------------------------- */
  function initMap() {
    if (!containerRef.current) return;
    const tt = (window as any).tt;
    if (!tt) {
      console.error('TomTom SDK not available on window.tt');
      return;
    }
    if (mapRef.current) return; // already initialized

    try {
      const map = tt.map({
        key: TOMTOM_KEY_CLIENT,
        container: containerRef.current,
        center: [initialCenter.lng, initialCenter.lat],
        zoom: initialZoom,
      });
      map.addControl(new tt.NavigationControl());
      mapRef.current = map;
      setIsReady(true);
    } catch (e) {
      console.error('TomTom map init error', e);
    }
  }

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
    if (!isReady || !mapRef.current) return;
    const map = mapRef.current;

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
        const marker = new (window as any).tt.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);

        const popupEl = document.createElement('div');
        popupEl.style.padding = '6px 8px';
        popupEl.style.fontSize = '13px';
        popupEl.innerText = p.name || 'Unknown';

        const popup = new (window as any).tt.Popup({ offset: 10 }).setDOMContent(popupEl);
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
  }, [participants, isReady, followId]);

  /* --------------------------
     ETA polling (calls /api/matrix-eta every 5s when computeRoutes === true)
     Normalizes several response shapes and calls onParticipantETA for each participant.
     -------------------------- */
  useEffect(() => {
    if (!isReady) return;

    if (computeRoutes) startPolling();
    else stopPolling();

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeRoutes, isReady, participants]);

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
      if (list.length === 0) return;

      const res = await fetch('/api/matrix-eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: list }),
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      if (!json) return;

      // Normalize common shapes (etas map, results array, map-of-maps)
      const normalized: Record<string, { etaSeconds: number | null; distanceMeters: number | null }> = {};

      // 1) { etas: { id: { etaSeconds, distanceMeters } } }
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
      // 2) results array [{id, etaSeconds, distanceMeters}, ...]
      else if (Array.isArray(json.results)) {
        json.results.forEach((it: any) => {
          if (!it || !it.id) return;
          normalized[it.id] = {
            etaSeconds: it.etaSeconds ?? it.durationSeconds ?? it.duration ?? null,
            distanceMeters: it.distanceMeters ?? it.distance ?? null,
          };
        });
      }
      // 3) array of objects with id at top level
      else if (Array.isArray(json)) {
        json.forEach((it: any) => {
          if (!it || !it.id) return;
          normalized[it.id] = {
            etaSeconds: it.etaSeconds ?? it.durationSeconds ?? it.duration ?? null,
            distanceMeters: it.distanceMeters ?? it.distance ?? null,
          };
        });
      }
      // 4) fallback: top-level map keyed by participant id
      else if (typeof json === 'object') {
        Object.entries(json).forEach(([k, v]) => {
          const anyV = v as any;
          if (anyV && (anyV.etaSeconds || anyV.distanceMeters || anyV.duration || anyV.distance)) {
            normalized[k] = {
              etaSeconds: anyV.etaSeconds ?? anyV.durationSeconds ?? anyV.duration ?? null,
              distanceMeters: anyV.distanceMeters ?? anyV.distance ?? null,
            };
          }
        });
      }

      // Dispatch normalized ETAs
      Object.entries(normalized).forEach(([id, val]) => {
        try {
          onParticipantETA && onParticipantETA(id, { etaSeconds: val.etaSeconds ?? null, distanceMeters: val.distanceMeters ?? null });
          // Update popup text too if marker exists
          const data = markersRef.current.get(id);
          if (data && data.popupEl) {
            const baseName = (participants[id] && participants[id].name) || data.popupEl.innerText.split('|', 1)[0].trim();
            const etaText = typeof val.etaSeconds === 'number' ? formatETA(val.etaSeconds) : '--';
            data.popupEl.innerText = `${baseName} | ETA: ${etaText}`;
          }
        } catch (e) {}
      });
    } catch (e) {
      // swallow errors silently
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
     Route drawing: call /api/route to get GeoJSON LineString and draw on map
     - We trigger when computeRoutes is true and origin & destination are provided
     - The server handles TomTom key & normalization
     -------------------------- */
  useEffect(() => {
    if (!isReady || !mapRef.current) return;
    if (!computeRoutes) {
      removeRouteLayer();
      return;
    }
    if (!origin || !destination) {
      // nothing to do
      removeRouteLayer();
      return;
    }
    fetchAndDrawRoute(origin, destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, computeRoutes, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  async function fetchAndDrawRoute(originArg: { lat: number; lng: number }, destinationArg: { lat: number; lng: number }) {
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: originArg, destination: destinationArg }),
      });
      if (!res.ok) {
        // no route available; remove existing
        removeRouteLayer();
        return;
      }
      const json = await res.json().catch(() => null);
      if (!json || !json.geojson || !Array.isArray((json.geojson as any).coordinates)) {
        removeRouteLayer();
        return;
      }
      drawGeoJsonRoute(json.geojson);
    } catch (e) {
      // ignore
    }
  }

  function removeRouteLayer() {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (map.getLayer && map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource && map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
    } catch (e) {
      // ignore
    }
  }

  function drawGeoJsonRoute(geojson: { type: string; coordinates: Array<[number, number]> }) {
    const map = mapRef.current;
    if (!map) return;
    if (!geojson || !Array.isArray(geojson.coordinates) || geojson.coordinates.length === 0) return;

    try {
      // Remove existing
      removeRouteLayer();

      // Add source
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: geojson.coordinates } },
      });

      // Add layer
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#1E90FF',
          'line-width': 6,
          'line-opacity': 0.95,
        },
      });

      // Fit bounds to route
      try {
        const lats = geojson.coordinates.map((c) => c[1]);
        const lons = geojson.coordinates.map((c) => c[0]);
        const sw: [number, number] = [Math.min(...lons), Math.min(...lats)];
        const ne: [number, number] = [Math.max(...lons), Math.max(...lats)];
        map.fitBounds([sw, ne], { padding: 60, linear: true });
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // Some TomTom SDK versions throw if source/layer exists — ignore and try replace
      try {
        removeRouteLayer();
        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: geojson.coordinates } },
        });
      } catch (ee) {}
    }
  }

  /* --------------------------
     Render
     -------------------------- */
  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!isReady && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            background: 'rgba(255,255,255,0.92)',
            padding: '6px 8px',
            borderRadius: 6,
            fontSize: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          }}
        >
          Loading map...
        </div>
      )}
    </div>
  );
}

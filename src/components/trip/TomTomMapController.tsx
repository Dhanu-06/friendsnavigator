'use client';

// components/trip/TomTomMapController.tsx
import React, { useEffect, useRef, useState } from "react";
import tt from "@tomtom-international/web-sdk-maps";
// @ts-ignore
import SearchBox from "@tomtom-international/web-sdk-plugin-searchbox";

const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;

type LatLng = { lat: number; lon: number };

export type Participant = {
  id: string;
  name: string;
  coords?: LatLng;
  avatarUrl?: string | null;
};

type Props = {
  origin?: { label?: string; coords?: LatLng } | null;
  destination?: { label?: string; coords?: LatLng } | null;
  participants?: Participant[]; // live participants with coords
  fitBounds?: boolean;
  onRouteETA?: (seconds: number | null) => void;
  onSearchResult?: (place: { label?: string; coords?: LatLng }) => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function TomTomMapController({
  origin,
  destination,
  participants = [],
  fitBounds = true,
  onRouteETA,
  onSearchResult,
  className,
  style,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const ttMapRef = useRef<any>(null);
  // markersRef holds marker, animation info, and cancel token
  const markersRef = useRef<Record<string, {
    marker: any;
    anim?: { frameId?: number; start?: number; duration?: number; from?: [number, number]; to?: [number, number] };
  }>>({});
  const routeLayerId = "route-layer";
  const [mapReady, setMapReady] = useState(false);

  // init map on client
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    if (!TOMTOM_KEY) {
      console.error("TomTom API key not set. Add NEXT_PUBLIC_TOMTOM_API_KEY to your .env file.");
      return;
    }
    if (ttMapRef.current) {
      setMapReady(true);
      return;
    }

    const map = tt.map({
      key: TOMTOM_KEY,
      container: mapRef.current,
      center: destination?.coords ? [destination.coords.lon, destination.coords.lat] : origin?.coords ? [origin.coords.lon, origin.coords.lat] : [77.5946, 12.9716],
      zoom: 12,
      language: "en-US",
    });

    ttMapRef.current = map;
    map.addControl(new tt.FullscreenControl());
    map.addControl(new tt.NavigationControl());

    try {
      const searchBox = new SearchBox({
        apiKey: TOMTOM_KEY,
        language: "en-US",
        position: "top-left",
      });
      map.addControl(searchBox);
      searchBox.on("tomtom.searchbox.result", (ev: any) => {
        const res = ev?.result;
        if (!res) return;
        const coords = res.position ? { lat: res.position.lat, lon: res.position.lon } : undefined;
        const label = res.address?.freeformAddress || res.poi?.name || res.label;
        onSearchResult?.({ label, coords });
      });
    } catch (e) {
      console.warn("SearchBox plugin not initialized", e);
    }

    map.on("load", () => setMapReady(true));

    return () => {
      try {
        map.remove();
      } catch (err) {}
      ttMapRef.current = null;
      // cancel animations
      Object.values(markersRef.current).forEach((entry) => {
        if (entry?.anim?.frameId) cancelAnimationFrame(entry.anim.frameId);
      });
      markersRef.current = {};
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: linear interpolation
  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  // Animate marker from current position -> target over durationMs
  function animateMarkerTo(key: string, marker: any, toLngLat: [number, number], durationMs = 800) {
    if (!marker) return;
    // cancel any previous animation for this marker
    const entry = markersRef.current[key] || (markersRef.current[key] = { marker });
    if (entry.anim?.frameId) {
      cancelAnimationFrame(entry.anim.frameId);
      entry.anim = undefined;
    }

    let from: [number, number];
    try {
      const cur = marker.getLngLat();
      from = [cur.lng, cur.lat];
    } catch (e) {
      from = [toLngLat[0], toLngLat[1]];
    }

    const start = performance.now();
    const animObj: any = { frameId: 0, start, duration: durationMs, from, to: toLngLat };
    entry.anim = animObj;

    const step = (now: number) => {
      const elapsed = now - animObj.start;
      const t = Math.min(1, elapsed / animObj.duration);
      const lng = lerp(animObj.from[0], animObj.to[0], t);
      const lat = lerp(animObj.from[1], animObj.to[1], t);
      try {
        marker.setLngLat([lng, lat]);
      } catch (e) {}
      if (t < 1) {
        animObj.frameId = requestAnimationFrame(step);
      } else {
        animObj.frameId = undefined;
        entry.anim = undefined;
      }
    };

    animObj.frameId = requestAnimationFrame(step);
  }

  // upsert marker (creates marker DOM + popup if needed)
  function upsertMarker(key: string, coords: LatLng, popupHtml?: string, options: {color?: string, avatarUrl?: string} = {}) {
    if (!ttMapRef.current) return;
    const { color = "#2b7cff", avatarUrl } = options;
    const existing = markersRef.current[key];
    if (existing && existing.marker) {
      // animate to new position
      animateMarkerTo(key, existing.marker, [coords.lon, coords.lat]);
      return existing.marker;
    }

    const el = document.createElement("div");
    el.style.width = "34px";
    el.style.height = "34px";
    el.style.borderRadius = "50%";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.background = color;
    el.style.color = "white";
    el.style.fontSize = "14px";
    el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4)";
    el.style.border = "2px solid white";
    el.style.overflow = "hidden";

    if (avatarUrl) {
      el.innerHTML = `<img src="${avatarUrl}" alt="${key}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
       el.textContent = key?.[0]?.toUpperCase?.() || "?";
    }

    const marker = new tt.Marker({ element: el }).setLngLat([coords.lon, coords.lat]).addTo(ttMapRef.current);
    if (popupHtml) {
      const popup = new tt.Popup({ offset: 20 }).setHTML(popupHtml);
      marker.setPopup(popup);
    }
    markersRef.current[key] = { marker };
    return marker;
  }

  function removeMarker(key: string) {
    const entry = markersRef.current[key];
    if (entry) {
      try {
        if (entry.anim?.frameId) cancelAnimationFrame(entry.anim.frameId);
        entry.marker.remove();
      } catch (e) {}
      delete markersRef.current[key];
    }
  }

  // participants effect (create/update markers and animate)
  useEffect(() => {
    if (!mapReady) return;
    const seen: Record<string, boolean> = {};
    participants.forEach((p) => {
      if (!p.coords) return;
      const key = `p-${p.id}`;
      upsertMarker(key, p.coords, `<b>${p.name}</b>`, { color: "#1E90FF", avatarUrl: p.avatarUrl || undefined });
      seen[key] = true;
    });
    // cleanup stale participant markers
    Object.keys(markersRef.current).forEach((k) => {
      if (k.startsWith("p-") && !seen[k]) removeMarker(k);
    });

    // optionally fit bounds
    if (fitBounds && ttMapRef.current) {
      const map = ttMapRef.current;
      const bounds = new tt.LngLatBounds();
      let added = false;
      participants.forEach((p) => {
        if (p.coords) { bounds.extend([p.coords.lon, p.coords.lat]); added = true; }
      });
      if (origin?.coords) { bounds.extend([origin.coords.lon, origin.coords.lat]); added = true; }
      if (destination?.coords) { bounds.extend([destination.coords.lon, destination.coords.lat]); added = true; }
      try {
        if (added) map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, mapReady]);

  // origin/destination + route effect
  useEffect(() => {
    if (!mapReady || !ttMapRef.current) return;

    removeMarker("origin");
    removeMarker("destination");

    if (origin?.coords) upsertMarker("origin", origin.coords, `<b>Origin</b><div>${origin.label || ""}</div>`, { color: "#2ECC71" });
    if (destination?.coords) upsertMarker("destination", destination.coords, `<b>Destination</b><div>${destination.label || ""}</div>`, { color: "#E74C3C" });

    async function fetchAndDrawRoute() {
      if (!origin?.coords || !destination?.coords) {
        try {
          const map = ttMapRef.current;
          if (map.getSource(routeLayerId)) {
            map.removeLayer(routeLayerId);
            map.removeSource(routeLayerId);
          }
        } catch (e) {}
        onRouteETA?.(null);
        return;
      }

      const a = `${origin.coords.lat},${origin.coords.lon}`;
      const b = `${destination.coords.lat},${destination.coords.lon}`;
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${a}:${b}/json?key=${TOMTOM_KEY}&routeType=fastest&traffic=true&computeBestOrder=false&view=Unified`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error("route fetch failed", await res.text());
          onRouteETA?.(null);
          return;
        }
        const j = await res.json();
        const route = j.routes?.[0];
        if (!route) {
          onRouteETA?.(null);
          return;
        }
        const travelSeconds = route.summary?.travelTimeInSeconds ?? route.summary?.travelTime ?? null;
        onRouteETA?.(travelSeconds ?? null);

        // decode coordinates robustly
        let coordinates: [number, number][] = [];
        if (route.legs && route.legs.length) {
          route.legs.forEach((leg: any) => {
            leg.points?.forEach((pt: any) => coordinates.push([pt.longitude, pt.latitude]));
          });
        }
        
        const map = ttMapRef.current;
        try {
          if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
          if (map.getSource(routeLayerId)) map.removeSource(routeLayerId);
        } catch (e) {}

        if (coordinates.length > 0) {
          map.addSource(routeLayerId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates },
            },
          });
          map.addLayer({
            id: routeLayerId,
            type: "line",
            source: routeLayerId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#3b82f6", "line-width": 5 },
          });
          try {
            const bounds = coordinates.reduce((b: any, c: any) => b.extend(c), new tt.LngLatBounds(coordinates[0], coordinates[0]));
            map.fitBounds(bounds, { padding: 80, duration: 500, maxZoom: 15 });
          } catch (e) {}
        }
      } catch (err) {
        console.error("route error", err);
        onRouteETA?.(null);
      }
    }

    fetchAndDrawRoute();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.coords?.lat, origin?.coords?.lon, destination?.coords?.lat, destination?.coords?.lon, mapReady]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", ...(style || {}) }}>
       {!TOMTOM_KEY && <div className="absolute inset-0 z-10 p-2 text-sm text-red-700 bg-red-50 flex items-center justify-center text-center">TomTom API key missing. Add NEXT_PUBLIC_TOMTOM_API_KEY to your .env file and restart the dev server.</div>}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

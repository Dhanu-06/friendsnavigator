'use client';

// components/trip/TomTomMapController.tsx
import React, { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

type Participant = { 
  id: string; 
  name: string; 
  coords?: LatLng; 
  avatarUrl?: string | null 
};

type Props = {
  origin?: { label?: string; coords?: LatLng } | null;
  destination?: { label?: string; coords?: LatLng } | null;
  participants?: Participant[];
  fitBounds?: boolean;
  computeRoutes?: boolean; // Kept for API compatibility, but logic is now external
  onParticipantETA?: (id: string, info: { etaSeconds: number | null; distanceMeters: number | null }) => void; // Kept for API compatibility
  onSearchResult?: (place: { label?: string; coords?: LatLng }) => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function TomTomMapController({
  origin,
  destination,
  participants = [],
  fitBounds = true,
  computeRoutes = false,
  onParticipantETA,
  onSearchResult,
  className,
  style,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const ttMapRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);
  const markersRef = useRef<Record<string, { marker: any; anim?: { frameId?: number; start?: number; duration?: number; from?: [number, number]; to?: [number, number] } }>>({});
  const routeLayerIdPrefix = "route-layer-";
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!TOMTOM_KEY) {
      console.error("TomTom API key not set.");
      return;
    }
    if (ttMapRef.current) {
      setMapReady(true);
      return;
    }

    let tt: any, SearchBox: any;

    const initMap = async () => {
      try {
        tt = await import("@tomtom-international/web-sdk-maps");
        SearchBox = (await import("@tomtom-international/web-sdk-plugin-searchbox")).default;
        sdkRef.current = tt;
      } catch (e) {
        console.error("Failed to load TomTom SDK", e);
        return;
      }

      const map = tt.default.map({
        key: TOMTOM_KEY,
        container: mapRef.current,
        center: destination?.coords ? [destination.coords.lng, destination.coords.lat] : [77.5946, 12.9716],
        zoom: 12,
        language: "en-US",
      });

      ttMapRef.current = map;
      map.addControl(new tt.default.FullscreenControl());
      map.addControl(new tt.default.NavigationControl());

      try {
        const searchBox = new SearchBox({ apiKey: TOMTOM_KEY, language: "en-US", position: "top-left" });
        map.addControl(searchBox);
        searchBox.on("tomtom.searchbox.result", (ev: any) => {
          if (!onSearchResult || !ev?.result) return;
          const { position, address, poi } = ev.result;
          const coords = position ? { lat: position.lat, lng: position.lng } : undefined;
          const label = address?.freeformAddress || poi?.name;
          onSearchResult({ label, coords });
        });
      } catch (e) {
        console.warn("SearchBox plugin not initialized", e);
      }

      map.on("load", () => setMapReady(true));
    };

    initMap();

    return () => {
      ttMapRef.current?.remove();
      ttMapRef.current = null;
      Object.values(markersRef.current).forEach(entry => entry.anim?.frameId && cancelAnimationFrame(entry.anim.frameId));
      markersRef.current = {};
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  function animateMarkerTo(key: string, marker: any, toLngLat: [number, number], durationMs = 800) {
    if (!marker) return;
    const entry = markersRef.current[key] || (markersRef.current[key] = { marker });
    if (entry.anim?.frameId) cancelAnimationFrame(entry.anim.frameId);

    let from: [number, number];
    try {
      const cur = marker.getLngLat();
      from = [cur.lng, cur.lat];
    } catch (e) {
      from = toLngLat;
    }

    const start = performance.now();
    const animObj = { frameId: 0, start, duration: durationMs, from, to: toLngLat };
    entry.anim = animObj;

    const step = (now: number) => {
      const elapsed = now - animObj.start;
      const t = Math.min(1, elapsed / animObj.duration);
      const lng = lerp(animObj.from[0], animObj.to[0], t);
      const lat = lerp(animObj.from[1], animObj.to[1], t);
      try { marker.setLngLat([lng, lat]); } catch (e) { }
      if (t < 1) animObj.frameId = requestAnimationFrame(step);
      else {
        animObj.frameId = undefined;
        entry.anim = undefined;
      }
    };
    animObj.frameId = requestAnimationFrame(step);
  }

  function upsertMarker(key: string, coords: LatLng, popupHtml?: string, options: { color?: string; avatarUrl?: string } = {}) {
    if (!ttMapRef.current || !sdkRef.current) return;
    const { color = "#2b7cff", avatarUrl } = options;
    const existing = markersRef.current[key];
    if (existing?.marker) {
      animateMarkerTo(key, existing.marker, [coords.lng, coords.lat]);
      return existing.marker;
    }

    const el = document.createElement("div");
    el.style.cssText = `width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${color};color:white;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,0.4);border:2px solid white;overflow:hidden;`;
    if (avatarUrl) el.innerHTML = `<img src="${avatarUrl}" alt="${key}" style="width:100%;height:100%;object-fit:cover;" />`;
    else el.textContent = key?.[0]?.toUpperCase() || "?";

    const marker = new sdkRef.current.default.Marker({ element: el }).setLngLat([coords.lng, coords.lat]).addTo(ttMapRef.current);
    if (popupHtml) marker.setPopup(new sdkRef.current.default.Popup({ offset: 20 }).setHTML(popupHtml));
    markersRef.current[key] = { marker };
    return marker;
  }

  function removeMarker(key: string) {
    const entry = markersRef.current[key];
    if (entry) {
      if (entry.anim?.frameId) cancelAnimationFrame(entry.anim.frameId);
      try { entry.marker.remove(); } catch (e) { }
      delete markersRef.current[key];
    }
  }

  useEffect(() => {
    if (!mapReady || !ttMapRef.current || !sdkRef.current) return;
    const seen: Record<string, boolean> = {};

    participants.forEach((p) => {
      if (!p.coords) return;
      const key = `p-${p.id}`;
      upsertMarker(key, p.coords, `<b>${p.name}</b>`, { color: "#1E90FF", avatarUrl: p.avatarUrl || undefined });
      seen[key] = true;
    });

    Object.keys(markersRef.current).forEach((k) => {
      if (k.startsWith("p-") && !seen[k]) removeMarker(k);
    });

    if (fitBounds) {
      const bounds = new sdkRef.current.default.LngLatBounds();
      let added = false;
      participants.forEach(p => { if (p.coords) { bounds.extend([p.coords.lng, p.coords.lat]); added = true; } });
      if (origin?.coords) { bounds.extend([origin.coords.lng, origin.coords.lat]); added = true; }
      if (destination?.coords) { bounds.extend([destination.coords.lng, destination.coords.lat]); added = true; }
      if (added) try { ttMapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 }); } catch (e) { }
    }
  }, [participants, mapReady, fitBounds, origin, destination]);

  useEffect(() => {
    if (!mapReady || !ttMapRef.current) return;
    removeMarker("origin");
    if (origin?.coords) upsertMarker("origin", origin.coords, `<b>Origin</b>`, { color: "#2ECC71" });
    removeMarker("destination");
    if (destination?.coords) upsertMarker("destination", destination.coords, `<b>Destination</b>`, { color: "#E74C3C" });
  }, [origin, destination, mapReady]);
  
  // Note: Route fetching logic is removed from here as it's now handled externally
  // by the new /api/matrix-eta endpoint and the TripRoomClient's useEffect.
  // The map controller is now only responsible for displaying markers.

  return <div ref={mapRef} className={className} style={{ width: "100%", height: "100%", ...(style || {}) }} />;
}

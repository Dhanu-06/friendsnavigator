// File: src/components/RoutePolyline.tsx
// React component to animate a TomTom route polyline and change color based on ETA
// Usage: <RoutePolyline map={map} routeCoords={coords} etaMinutes={eta} onComplete={() => {}} />

import React, { useEffect, useRef } from "react";

export type LatLng = { latitude: number; longitude: number };

type RoutePolylineProps = {
  map: any; // tt.Map instance (TomTom SDK) — typed as any to avoid forcing user's tt types
  routeCoords: LatLng[]; // full route coordinates in order
  etaMinutes?: number; // ETA in minutes (used to compute color)
  id?: string; // optional id suffix for map source/layer
  animationSpeed?: number; // milliseconds per step (smaller = faster)
  lineWidth?: number;
  onComplete?: () => void;
};

// Decide color based on ETA (minutes)
function getColorFromETA(eta?: number) {
  if (eta == null || Number.isNaN(eta)) return "#00b050"; // default green
  if (eta <= 5) return "#16a34a"; // green (tailwind emerald-600-ish)
  if (eta <= 12) return "#f59e0b"; // orange (amber-500)
  return "#ef4444"; // red (rose-500)
}

// Convert LatLng[] to [lng, lat][] (GeoJSON order)
function toGeoJsonCoords(coords: LatLng[]) {
  return coords.map((c) => [c.longitude, c.latitude]);
}

export default function RoutePolyline({
  map,
  routeCoords,
  etaMinutes,
  id = "main-route",
  animationSpeed = 8, // ms per point (tweak to speed up/down)
  lineWidth = 6,
  onComplete,
}: RoutePolylineProps) {
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;
  const animationRef = useRef<number | null>(null);
  const addedRef = useRef(false);
  const lastEtaRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!map || !routeCoords || routeCoords.length === 0) return;

    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [], // start empty for animation
      },
    } as any;

    // Remove existing if present
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch (e) {
      // ignore
    }

    // Add source and layer
    map.addSource(sourceId, {
      type: "geojson",
      data: geojson,
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": getColorFromETA(etaMinutes),
        "line-width": lineWidth,
        "line-opacity": 1,
      },
    });

    // Ensure visible bounds
    try {
      const bbox = toGeoJsonCoords(routeCoords).reduce(
        (acc: number[] | null, c: number[]) => {
          if (!acc) return [c[0], c[1], c[0], c[1]];
          return [Math.min(acc[0], c[0]), Math.min(acc[1], c[1]), Math.max(acc[2], c[0]), Math.max(acc[3], c[1])];
        },
        null
      );

      if (bbox) {
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, duration: 600 });
      }
    } catch (e) {
      // ignore
    }

    // Animate: reveal points one-by-one using requestAnimationFrame
    const fullCoords = toGeoJsonCoords(routeCoords);
    let idx = 0;

    function step() {
      if (!map.getSource(sourceId)) return;

      idx += 1;
      const slice = fullCoords.slice(0, idx);
      (map.getSource(sourceId) as any).setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: slice } });

      if (idx < fullCoords.length) {
        animationRef.current = window.setTimeout(() => requestAnimationFrame(step) as unknown as number, animationSpeed) as unknown as number;
      } else {
        // animation complete
        addedRef.current = true;
        if (onComplete) onComplete();
      }
    }

    // Kick off animation
    step();

    // Cleanup on unmount or route change
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {
        // ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(routeCoords)]);

  // Update color dynamically when ETA changes
  useEffect(() => {
    if (!map) return;
    const color = getColorFromETA(etaMinutes);
    try {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "line-color", color);
      }
    } catch (e) {
      // ignore if layer not ready
    }
    lastEtaRef.current = etaMinutes;
  }, [map, etaMinutes]);

  return null; // this component only manipulates the TomTom map instance
}

// src/components/TripMap.client.tsx
"use client";
import React, { useEffect, useRef } from "react";
import useTomTomLoader from "../lib/useTomTomLoader";

type Props = {
  center?: [number, number];
  zoom?: number;
};

export default function TripMap({ center = [77.5946, 12.9716], zoom = 12 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const routeLayerIdRef = useRef<string | null>(null);
  const { loaded, error } = useTomTomLoader();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!loaded) return;
    if (!containerRef.current) return;
    if ((window as any).tt === undefined) {
      console.error("TomTom SDK loaded but window.tt undefined");
      return;
    }
    if (mapRef.current) return;

    try {
      const tt = (window as any).tt;
      const key = process.env.NEXT_PUBLIC_TOMTOM_KEY;
      if (!key) {
        console.error("Missing TomTom key");
        return;
      }
      mapRef.current = tt.map({
        key,
        container: containerRef.current,
        center,
        zoom,
      });

      new tt.Marker().setLngLat(center).addTo(mapRef.current);

      // attach helper to window for other code to call
      (window as any).__trip_map = mapRef.current;

      // draw geojson route: clears previous route and draws new
      (window as any).__trip_map_drawRoute = function drawRoute(geojson: any) {
        try {
          if (!mapRef.current) return;
          const map = mapRef.current;
          const sourceId = "trip-route-source";
          const layerIdPrimary = "trip-route-line-primary";
          const layerIdSecondary = "trip-route-line-secondary";

          // remove previous layers & source if present
          try {
            if (map.getLayer(layerIdPrimary)) map.removeLayer(layerIdPrimary);
            if (map.getLayer(layerIdSecondary)) map.removeLayer(layerIdSecondary);
          } catch (e) {}
          try {
            if (map.getSource(sourceId)) map.removeSource(sourceId);
          } catch (e) {}

          // add new source
          map.addSource(sourceId, {
            type: "geojson",
            data: geojson,
          });

          // primary route line (solid)
          map.addLayer({
            id: layerIdPrimary,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round"
            },
            paint: {
              "line-color": "#2b8cff",
              "line-width": 5,
            },
          });

          // optional secondary (dashed) style, same data but dashed
          map.addLayer({
            id: layerIdSecondary,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round"
            },
            paint: {
              "line-color": "#9fbfff",
              "line-width": 3,
              "line-dasharray": [2, 2]
            },
          });

          // fit bounds to geometry
          try {
            const coords = geojson?.features?.[0]?.geometry?.coordinates;
            if (coords && coords.length) {
              const lats = coords.map((c: any) => c[1]);
              const lngs = coords.map((c: any) => c[0]);
              const minLat = Math.min(...lats), maxLat = Math.max(...lats);
              const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
              map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60 });
            }
          } catch (e) {
            console.warn("fitBounds error", e);
          }
        } catch (e) {
          console.error("drawRoute error", e);
        }
      };
    } catch (err) {
      console.error("TomTom map init failed:", err);
    }

    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          (window as any).__trip_map = undefined;
          (window as any).__trip_map_drawRoute = undefined;
        }
      } catch (e) {
        console.warn("Map cleanup error", e);
      }
    };
  }, [loaded, center, zoom]);

  return (
    <div style={{ width: "100%", minHeight: 500, height: "100%" }}>
      {error ? (
        <div style={{ padding: 12, color: "red", background: '#ffebee', border: '1px solid red', borderRadius: 8 }}>
          TomTom load error: {error}
        </div>
      ) : null}
       {!loaded && !error && (
         <div style={{ width: "100%", height: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
            Loading map...
         </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 500, opacity: loaded ? 1 : 0 }} />
    </div>
  );
}

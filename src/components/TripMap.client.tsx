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

      // Expose main map for debugging
      (window as any).__trip_map = mapRef.current;

      // Primary route drawing (solid + secondary dashed)
      (window as any).__trip_map_drawRoute = function drawRoute(geojson: any) {
        try {
          if (!mapRef.current) return;
          const map = mapRef.current;
          const sourceId = "trip-route-source";
          const primaryId = "trip-route-line-primary";
          const secondaryId = "trip-route-line-secondary";

          // remove previous primary/secondary layers & source
          try { if (map.getLayer(primaryId)) map.removeLayer(primaryId); } catch {}
          try { if (map.getLayer(secondaryId)) map.removeLayer(secondaryId); } catch {}
          try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}

          map.addSource(sourceId, { type: "geojson", data: geojson });

          map.addLayer({
            id: primaryId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#2b8cff", "line-width": 6 },
          });

          map.addLayer({
            id: secondaryId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#9fbfff", "line-width": 3, "line-dasharray": [3, 3] },
          });

          // fit bounds
          try {
            const coords = geojson?.features?.[0]?.geometry?.coordinates;
            if (coords && coords.length) {
              const lats = coords.map((c: any) => c[1]);
              const lngs = coords.map((c: any) => c[0]);
              const minLat = Math.min(...lats), maxLat = Math.max(...lats);
              const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
              map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60 });
            }
          } catch (e) { console.warn("fitBounds error", e); }
        } catch (e) {
          console.error("drawRoute error", e);
        }
      };

      // Preview drawing — separate source & layer so it can be toggled/cleared
      (window as any).__trip_map_drawPreview = function drawPreview(geojson: any) {
        try {
          if (!mapRef.current) return;
          const map = mapRef.current;
          const sourceId = "trip-preview-source";
          const layerId = "trip-preview-line";

          try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
          try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}

          map.addSource(sourceId, { type: "geojson", data: geojson });

          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#ff8c42", "line-width": 4, "line-dasharray": [6, 4], "line-opacity": 0.9 },
          });

          // optional: do not fit bounds for preview (keeps user map position)
        } catch (e) {
          console.error("drawPreview error", e);
        }
      };

      (window as any).__trip_map_clearPreview = function clearPreview() {
        try {
          if (!mapRef.current) return;
          const map = mapRef.current;
          const sourceId = "trip-preview-source";
          const layerId = "trip-preview-line";
          try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
          try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}
        } catch (e) {
          console.warn("clearPreview error", e);
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
          (window as any).__trip_map_drawPreview = undefined;
          (window as any).__trip_map_clearPreview = undefined;
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

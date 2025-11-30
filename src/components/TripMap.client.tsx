"use client";
import React, { useEffect, useRef } from "react";
import useTomTomLoader from "../lib/useTomTomLoader";

type Props = {
  center?: [number, number]; // [lng, lat]
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
    if (mapRef.current) return; // already initialized

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

      // add one marker to confirm display
      new tt.Marker().setLngLat(center).addTo(mapRef.current);

      // optionally expose to window for debugging
      (window as any).__trip_map = mapRef.current;
    } catch (err) {
      console.error("TomTom map init failed:", err);
    }

    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
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

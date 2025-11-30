// src/components/TripRoomClient.tsx
"use client";
import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/fetchJson";
import DestinationSearch from "@/components/DestinationSearch.client";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

export default function TripRoomClient({ tripId }: { tripId: string }) {
  const [status, setStatus] = useState<string>("");

  // normalize TomTom route response -> GeoJSON LineString FeatureCollection
  function normalizeRouteToGeoJSON(tomtomData: any) {
    try {
      // TomTom calculateRoute returns geometry in routes[0].legs[*].points or routes[0].routeGeometry? Adapt as needed
      const route = tomtomData?.routes?.[0];
      if (!route) return null;

      // try route.geometry if present as polyline or points
      let coords: [number, number][] = [];

      // 1) route.legs[].points format (array of {latitude, longitude}) OR {points: [{lat,lon}]}
      if (route.legs && route.legs.length) {
        for (const leg of route.legs) {
          if (leg.points && leg.points.length) {
            for (const p of leg.points) {
              // some TomTom versions use lat/lon or latitude/longitude
              const lat = p.latitude ?? p.lat ?? p[1];
              const lon = p.longitude ?? p.lon ?? p[0];
              if (typeof lon === "number" && typeof lat === "number") {
                coords.push([lon, lat]);
              }
            }
          } else if (leg.points && typeof leg.points === "string") {
            // ignore
          }
        }
      }

      // 2) route.geometry might contain an encoded polyline or raw coordinates depending on your API call
      if (coords.length === 0 && route.geometry) {
        // if geometry is an array of coordinate arrays
        if (Array.isArray(route.geometry) && Array.isArray(route.geometry[0])) {
          coords = route.geometry.map((c: any) => [c[0], c[1]]);
        } else if (typeof route.geometry === "string") {
          // encoded polyline — try decode (TomTom uses flexible encodings). We will attempt simple polyline decode if needed.
          // You may need to adapt this based on the format your API returns.
          // For now fall back to null
          console.warn("Encoded geometry returned; cannot decode automatically in this simple helper.");
        }
      }

      if (!coords || coords.length === 0) return null;

      const geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coords,
            },
          },
        ],
      };
      return geojson;
    } catch (e) {
      console.error("normalize error", e);
      return null;
    }
  }

  async function onDestinationSelected({ label, lng, lat }: { label: string; lng: number; lat: number }) {
    try {
      setStatus(`Selected: ${label} — querying route...`);
      // Example origin: center of map or pick a real participant origin
      const origin = "77.5946,12.9716"; // TODO: replace with real origin
      const dest = `${lng},${lat}`;
      const data = await fetchJson(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`);
      console.log("Route data", data);
      if (data?.geojson) {
        const geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: data.geojson }]};
        if (geojson && (window as any).__trip_map_drawRoute) {
          (window as any).__trip_map_drawRoute(geojson);
          setStatus(`Route drawn to ${label}`);
        } else {
          setStatus("Could not build route geometry to draw");
        }
      } else {
        setStatus("Route API returned no data");
      }

      // Trigger ETA refresh (simple example: call matrix endpoint single origin->dest)
      try {
        const origins = origin;
        const destinations = dest;
        const mat = await fetchJson(`/api/matrix-eta?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}`);
        console.log("Matrix ETA response", mat);
        // Use mat.data to update UI/popups — adapt as your app needs
        if (mat?.data) {
          setStatus((s) => s + " · ETA refreshed");
        }
      } catch (e) {
        console.warn("Matrix ETA error", e);
      }
    } catch (err: any) {
      console.error("Selection/route error", err);
      setStatus("Error fetching route: " + err.message);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <DestinationSearch onSelect={onDestinationSelected} />
        </div>
        <div style={{ minWidth: 240, color: "#444" }}>
          {status}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 600 }}>
            <TripMap />
          </div>
        </div>

        <aside style={{ width: 320, borderLeft: "1px solid #eee", paddingLeft: 12 }}>
          <h3>Participants</h3>
          {/* participant list UI */}
        </aside>
      </div>
    </div>
  );
}

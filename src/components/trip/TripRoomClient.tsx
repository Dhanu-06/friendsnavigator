// src/components/trip/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useEtaService from "../../hooks/useEtaService";
import { fetchJson } from "@/lib/fetchJson";
import DestinationSearch from "../DestinationSearch.client";
import useTripRealtime from "@/hooks/useTripRealtime";
import { useUser } from "@/firebase/auth/use-user";
import TomTomMapController from "./TomTomMapController";
import RoutePolyline from "../RoutePolyline";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

type Participant = {
  id: string;
  name: string;
  vehicle?: string;
  // current position:
  lng: number;
  lat: number;
};

const mockParticipants: Participant[] = [
  { id: "p1", name: "traveller2", vehicle: "Car", lng: 77.59, lat: 12.97 },
  { id: "p2", name: "traveller", vehicle: "Car", lng: 77.595, lat: 12.975 },
];

export default function TripRoomClient({ tripId }: { tripId: string }) {
  const [status, setStatus] = useState<string>("");
  const [dest, setDest] = useState<{ label: string; lng: number; lat: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const etaService = useEtaService({ smoothingAlpha: 0.25, assumedSpeedKmph: 35 });
  const { user: authUser, loading: authLoading } = useUser();

  const {
    tripDoc,
    participants,
    messages,
    expenses,
    status: tripStatus,
    error: tripError,
    sendMessage,
    addExpense,
  } = useTripRealtime(tripId, authUser);

  const currentUser = useMemo(() => {
    if (!authUser) return null;
    return {
      id: authUser.uid,
      name: authUser.displayName || authUser.email || 'Anonymous',
      avatarUrl: authUser.photoURL || `https://i.pravatar.cc/150?u=${authUser.uid}`,
      mode: tripDoc?.mode || 'car',
    };
  }, [authUser, tripDoc]);


  // subscribe to eta changes to re-render
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = etaService.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, [etaService]);

  // helper: request route from origin->dest and draw preview
  async function showPreviewForParticipant(participant: Participant) {
    if (!dest) return;
    try {
      setStatus(`Fetching preview for ${participant.name}...`);
      const origin = `${participant.lng},${participant.lat}`;
      const destination = `${dest.lng},${dest.lat}`;
      const routeResp = await fetchJson(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
      // normalize into geojson
      const geojson = normalizeRouteToGeoJSON(routeResp?.data);
      if (geojson && (window as any).__trip_map_drawPreview) {
        (window as any).__trip_map_drawPreview(geojson);
      }
      // use matrix to get ETA & distance if available
      try {
        const mat = await fetchJson(`/api/matrix-eta?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}`);
        // TomTom matrix may contain travelTimeInSeconds/distanceInMeters in different fields; attempt to extract best values
        const extracted = extractMatrixSummary(mat?.data);
        // feed to ETA service
        etaService.updateRaw(participant.id, { etaSeconds: extracted?.travelTimeInSeconds, distanceMeters: extracted?.distanceInMeters, timestamp: Date.now() });
      } catch (e) {
        // fallback: try to get distance from routeResp route data
        const distanceMeters = extractRouteDistance(routeResp?.data);
        etaService.updateRaw(participant.id, { distanceMeters });
      }
      setStatus(`Preview drawn for ${participant.name}`);
    } catch (err: any) {
      console.error("Preview error", err);
      setStatus("Preview failed: " + (err?.message ?? "unknown"));
    }
  }

  function clearPreview() {
    if ((window as any).__trip_map_clearPreview) (window as any).__trip_map_clearPreview();
  }

  // When destination changes, optionally draw full route for trip (main route)
  useEffect(() => {
    async function drawMainRoute() {
      if (!dest) return;
      try {
        setStatus("Drawing main route...");
        const origin = "77.5946,12.9716"; // TODO: use trip origin pickup
        const destination = `${dest.lng},${dest.lat}`;
        const routeResp = await fetchJson(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
        const geojson = normalizeRouteToGeoJSON(routeResp?.data);
        if (geojson && (window as any).__trip_map_drawRoute) {
          (window as any).__trip_map_drawRoute(geojson);
        }
        setStatus("Main route drawn");
      } catch (e: any) {
        console.warn("Main route draw error", e);
        setStatus("Could not draw main route: " + (e?.message ?? ""));
      }
    }
    drawMainRoute();
  }, [dest]);

  // simple getter for smoothed ETA
  function getEtaText(participantId: string) {
    const sm = etaService.getSmoothed(participantId);
    if (!sm) return "—";
    const s = Math.round(sm.etaSeconds);
    if (s < 60) return `${s}s`;
    const mins = Math.round(s / 60);
    return `${mins}m`;
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <DestinationSearch onSelect={(s) => { setDest(s); setStatus(`Destination: ${s.label}`); }} />
        </div>
        <div style={{ minWidth: 220 }}>{status}</div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 600 }}>
            <TripMap />
          </div>
        </div>

        <aside style={{ width: 360, borderLeft: "1px solid #eee", paddingLeft: 12 }}>
          <h3>Participants</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {participants.map((p) => {
              const isHovered = hovered === p.id;
              return (
                <div key={p.id}
                  onMouseEnter={() => { if(p.lat && p.lng) { setHovered(p.id); showPreviewForParticipant(p as Participant); } }}
                  onMouseLeave={() => { setHovered(null); clearPreview(); }}
                  onClick={() => { /* maybe center map or open details */ }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 8,
                    borderRadius: 8, background: isHovered ? "#fbfbff" : "white", cursor: "pointer"
                  }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", background: "#ddd" }}>
                    <img src={p.avatarUrl} alt={p.name} style={{width: '100%', height: '100%'}}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ color: "#666" }}>{p.mode}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{getEtaText(p.id)}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>ETA</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------
   Helpers: normalize & extract
   ------------------------- */

function normalizeRouteToGeoJSON(tomtomData: any) {
  try {
    const route = tomtomData?.routes?.[0];
    if (!route) return null;

    // try legs[].points (TomTom may return lat/lon per point)
    const coords: [number, number][] = [];
    if (route.legs && Array.isArray(route.legs)) {
      for (const leg of route.legs) {
        if (Array.isArray(leg.points)) {
          for (const p of leg.points) {
            const lat = p.latitude ?? p.lat ?? (Array.isArray(p) ? p[1] : undefined);
            const lon = p.longitude ?? p.lon ?? (Array.isArray(p) ? p[0] : undefined);
            if (typeof lat === "number" && typeof lon === "number") coords.push([lon, lat]);
          }
        }
      }
    }

    // fallback: route.geometry array
    if (coords.length === 0 && route.geometry && Array.isArray(route.geometry) && Array.isArray(route.geometry[0])) {
      for (const c of route.geometry) coords.push([c[0], c[1]]);
    }

    if (coords.length === 0) return null;

    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }],
    };
  } catch (e) {
    console.error("normalizeRouteToGeoJSON error", e);
    return null;
  }
}

function extractMatrixSummary(matrixData: any) {
  try {
    // TomTom matrix structure varies; attempt sensible picks
    // matrixData.matrix || matrixData.summary || matrixData.response
    // Many TomTom responses include "matrix" with summary travel times
    if (!matrixData) return null;
    // v1 example: matrix.summary.travelTimeInSeconds etc
    if (typeof matrixData.travelTimeInSeconds === "number" || typeof matrixData.distanceInMeters === "number") {
      return { travelTimeInSeconds: matrixData.travelTimeInSeconds, distanceInMeters: matrixData.distanceInMeters };
    }
    // v2 example: matrix contains a 2d array of summaries
    // attempt to find first numeric travelTimeInSeconds
    const maybe = matrixData?.matrix?.[0]?.[0] || matrixData?.summary || matrixData?.results?.[0]?.summary;
    if (maybe && (maybe.travelTimeInSeconds || maybe.distanceInMeters || maybe.distance)) {
      return { travelTimeInSeconds: maybe.travelTimeInSeconds ?? maybe.travel_time ?? maybe.duration ?? undefined, distanceInMeters: maybe.distanceInMeters ?? maybe.distance ?? undefined };
    }
    // For safety, search object tree for numbers named travelTimeInSeconds/distanceInMeters
    let found: any = null;
    (function walk(o: any) {
      if (!o || typeof o !== "object" || found) return;
      if (typeof o.travelTimeInSeconds === "number" || typeof o.distanceInMeters === "number") { found = o; return; }
      for (const k of Object.keys(o)) walk(o[k]);
    })(matrixData);
    if (found) return { travelTimeInSeconds: found.travelTimeInSeconds, distanceInMeters: found.distanceInMeters };
    return null;
  } catch (e) {
    console.warn("extractMatrixSummary error", e);
    return null;
  }
}

function extractRouteDistance(routeData: any) {
  try {
    const route = routeData?.routes?.[0];
    if (!route) return undefined;
    // TomTom route may have summary.distanceInMeters or summary[0].lengthInMeters
    if (route.summary?.lengthInMeters) return route.summary.lengthInMeters;
    if (route.summary?.distanceInMeters) return route.summary.distanceInMeters;
    if (route.distanceInMeters) return route.distanceInMeters;
    // search nested
    let found: number | undefined = undefined;
    (function walk(o: any) {
      if (found) return;
      if (o && typeof o === "object") {
        if (typeof o.distanceInMeters === "number") { found = o.distanceInMeters; return; }
        for (const k of Object.keys(o)) walk(o[k]);
      }
    })(route);
    return found;
  } catch (e) {
    console.warn("extractRouteDistance error", e);
    return undefined;
  }
}

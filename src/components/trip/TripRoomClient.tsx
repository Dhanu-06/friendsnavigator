// src/components/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useEtaPoller from "../../hooks/useEtaPoller";
import { fetchJson } from "@/lib/fetchJson";
import DestinationSearch from "../DestinationSearch.client";
import useTripRealtime from "@/hooks/useTripRealtime";
import { useUser } from "@/firebase/auth/use-user";
import TomTomMapController from "./TomTomMapController";
import useLiveLocation from "@/hooks/useLiveLocation";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

type Participant = { id: string; name: string; vehicle?: string; lng: number; lat: number; };

export default function TripRoomClient({ tripId }: { tripId: string }) {
  // UI state
  const [live, setLive] = useState(true);
  const { user, loading: userLoading } = useUser();
  
  const { 
    tripDoc, 
    participants, 
    status: tripStatus,
    error: tripError,
  } = useTripRealtime(tripId, user);

  const { lastPosition } = useLiveLocation(tripId, user ? { id: user.uid, name: user.displayName || 'Me' } : null, { enableWatch: live });


  const [destination, setDestination] = useState<{ lat: number; lng: number, name?: string } | null>(null);
  const [status, setStatus] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinnedPreview, setPinnedPreview] = useState<string | null>(null);
  const [originMode, setOriginMode] = useState<"pickup" | "device" | "participant">("pickup");
  const [participantOriginId, setParticipantOriginId] = useState<string | null>(null);

  useEffect(() => {
    if (tripDoc?.destination) {
      setDestination(tripDoc.destination);
    }
  }, [tripDoc]);


  // compute origin position based on origin mode
  function computeOrigin() {
    if (originMode === "pickup") {
      return tripDoc?.pickup || null;
    } else if (originMode === "device") {
      return lastPosition || null;
    } else if (originMode === "participant") {
      if (!participantOriginId) return null;
      const p = participants.find(x => x.id === participantOriginId);
      if (!p || !p.coords) return null;
      return { lat: p.coords.lat, lng: p.coords.lng };
    }
    return null;
  }
  
  const mainOrigin = computeOrigin();

  const liveParticipants = useMemo(() => {
    return participants.filter(p => p.coords?.lat && p.coords?.lng).map(p => ({
        id: p.id,
        lat: p.coords!.lat,
        lng: p.coords!.lng,
        name: p.name,
    }));
  }, [participants]);

  // Poller: participants feed into polling; destination used as target
  const poller = useEtaPoller({
    participants: liveParticipants,
    destination,
    live,
    intervalMs: 5000,
    assumedSpeedKmph: 35,
  });

  useEffect(() => {
    setStatus(live ? "Live ON" : "Live OFF");
  }, [live]);

  // SAFE subscribe / re-render mechanism
  const [, setTick] = useState(0);
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (poller && typeof (poller as any).subscribe === "function") {
      cleanup = (poller as any).subscribe(() => setTick(t => t + 1));
    } else if (poller && typeof (poller as any).getSmoothed === "function") {
      const iv = window.setInterval(() => setTick(t => t + 1), 1500);
      cleanup = () => window.clearInterval(iv);
    }

    return () => { try { cleanup && cleanup(); } catch {} };
  }, [poller]);


  async function togglePinPreview(p: Participant) {
    try {
      if (pinnedPreview === p.id) {
        setPinnedPreview(null);
        if ((window as any).__trip_map_clearPreview) (window as any).__trip_map_clearPreview();
        setStatus(`Unpinned preview for ${p.name}`);
        return;
      }
      setPinnedPreview(p.id);
      if (!p.coords) return;
      const origin = `${p.coords.lng},${p.coords.lat}`;
      if (!destination) {
        setStatus("Select a destination first to generate preview.");
        return;
      }
      const destStr = `${destination.lng},${destination.lat}`;
      setStatus(`Pinning preview for ${p.name}...`);
      const { data: routeData } = await fetchJson(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destStr)}`);
      const geojson = normalizeRouteToGeoJSON(routeData);
      if (geojson && (window as any).__trip_map_drawPreview) {
        (window as any).__trip_map_drawPreview(geojson);
      }
      setStatus(`Pinned preview for ${p.name}`);
    } catch (e: any) {
      console.error("pin preview error", e);
      setStatus("Pin preview failed: " + (e?.message ?? ""));
    }
  }

  async function handleHoverIn(p: Participant) {
    setHovered(p.id);
    if (pinnedPreview === p.id) return;
    if (!destination || !p.coords) return;
    try {
      const origin = `${p.coords.lng},${p.coords.lat}`;
      const destStr = `${destination.lng},${destination.lat}`;
      const { data: routeData } = await fetchJson(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destStr)}`);
      const geojson = normalizeRouteToGeoJSON(routeData);
      if (geojson && (window as any).__trip_map_drawPreview) {
        (window as any).__trip_map_drawPreview(geojson);
      }
    } catch (e) {
      console.warn("hover preview error", e);
    }
  }

  async function handleHoverOut(_p: Participant) {
    setHovered(null);
    if (pinnedPreview) return;
    if ((window as any).__trip_map_clearPreview) (window as any).__trip_map_clearPreview();
  }

  useEffect(() => {
    async function drawMain() {
      if (!destination || !mainOrigin) return;
      try {
        setStatus("Drawing main route...");
        const originStr = `${mainOrigin.lng},${mainOrigin.lat}`;
        const destStr = `${destination.lng},${destination.lat}`;
        const { data: routeData } = await fetchJson(`/api/route?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`);
        const geojson = normalizeRouteToGeoJSON(routeData);
        if (geojson && (window as any).__trip_map_drawRoute) (window as any).__trip_map_drawRoute(geojson);
        setStatus("Main route drawn");
      } catch (e) {
        console.warn("drawMain error", e);
        setStatus("Could not draw main route");
      }
    }
    drawMain();
  }, [destination, mainOrigin]);

  function getEtaText(id: string) {
    try {
      const sm = poller?.getSmoothed ? (poller as any).getSmoothed(id) : undefined;
      if (!sm) return "—";
      const s = Math.round(sm.etaSeconds);
      if (s < 60) return `${s}s`;
      return `${Math.round(s / 60)}m`;
    } catch (e) {
      return "—";
    }
  }

  function onDestinationSelect(s: any) {
    const lat = s.lat ?? s.latitude ?? null;
    const lng = s.lng ?? s.lon ?? s.longitude ?? null;
    if (typeof lat !== "number" || typeof lng !== "number") {
      console.warn("Destination selection shape unexpected", s);
      return;
    }
    setDestination({ lat, lng });
  }

  if(userLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading User...</div>
  }

  if (!tripDoc) {
     return <div className="flex h-screen w-full items-center justify-center">
        {tripStatus === 'connecting' && 'Connecting to trip...'}
        {tripStatus === 'offline' && 'Could not connect to trip. Displaying offline data.'}
        {tripStatus === 'error' && `Error: ${tripError?.message}`}
        {!tripStatus && 'Loading trip...'}
     </div>;
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <DestinationSearch onSelect={onDestinationSelect} />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Origin</div>
          <select value={originMode} onChange={(e) => setOriginMode(e.target.value as any)}>
            <option value="pickup">Pickup</option>
            <option value="device">My device</option>
            <option value="participant">Participant</option>
          </select>
          {originMode === "participant" && (
            <select value={participantOriginId ?? ""} onChange={(e) => setParticipantOriginId(e.target.value || null)}>
              <option value="">— select —</option>
              {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ marginRight: 8 }}>
            Live
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} style={{ marginLeft: 8 }} />
          </label>
          <div style={{ fontSize: 12, color: "#666" }}>{status}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 600 }}>
             <TomTomMapController 
                participants={liveParticipants.reduce((acc, p) => ({...acc, [p.id]: p }), {})}
                destination={destination}
                computeRoutes={live}
             />
          </div>
        </div>

        <aside style={{ width: 380, borderLeft: "1px solid #eee", paddingLeft: 12 }}>
          <h3>Participants</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {participants.map(p => {
              const isHovered = hovered === p.id;
              const isPinned = pinnedPreview === p.id;
              return (
                <div key={p.id}
                  onMouseEnter={() => handleHoverIn(p as Participant)}
                  onMouseLeave={() => handleHoverOut(p as Participant)}
                  onClick={() => togglePinPreview(p as Participant)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 10,
                    borderRadius: 8, background: isPinned ? "#eef6ff" : (isHovered ? "#fbfbff" : "white"),
                    cursor: "pointer", border: isPinned ? "1px solid #5b9cff" : "1px solid #f3f3f3"
                  }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", background: "#ddd" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{p.name} {isPinned ? "📌" : ""}</div>
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

          <div style={{ marginTop: 14 }}>
            <button onClick={() => {
              setPinnedPreview(null);
              if ((window as any).__trip_map_clearPreview) (window as any).__trip_map_clearPreview();
            }}>Clear pinned preview</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function normalizeRouteToGeoJSON(tomtomData: any) {
  try {
    const route = tomtomData?.routes?.[0];
    if (!route) return null;
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

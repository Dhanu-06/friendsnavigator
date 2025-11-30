
// src/components/trip/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useEtaPoller from "../../hooks/useEtaPoller";
import { fetchJson } from "@/lib/fetchJson";
import DestinationSearch from "../DestinationSearch.client";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

type Participant = { id: string; name: string; vehicle?: string; lng: number; lat: number; };
const mockParticipants: Participant[] = [
  { id: "p1", name: "traveller2", vehicle: "Car", lng: 77.59, lat: 12.97 },
  { id: "p2", name: "traveller", vehicle: "Car", lng: 77.595, lat: 12.975 },
];

export default function TripRoomClient() {
  // UI state
  const [live, setLive] = useState(true);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinnedPreview, setPinnedPreview] = useState<string | null>(null); // participant id that is pinned
  const [originMode, setOriginMode] = useState<"pickup" | "device" | "participant">("pickup");
  const [participantOriginId, setParticipantOriginId] = useState<string | null>(null);

  // participants (replace with your Firestore-driven state in future)
  const participants = useMemo(() => mockParticipants, []);

  // compute origin position based on origin mode
  function computeOrigin() {
    if (originMode === "pickup") {
      // TODO: Replace with real trip pickup coordinates
      return { lat: 12.9716, lng: 77.5946 };
    } else if (originMode === "device") {
      // try geolocation (best-effort)
      // we return null if not available; poller won't start until destination + participants exist
      // get last known - we won't block UI waiting for permission
      return (window as any).__device_location || null;
    } else if (originMode === "participant") {
      if (!participantOriginId) return null;
      const p = participants.find(x => x.id === participantOriginId);
      if (!p) return null;
      return { lat: p.lat, lng: p.lng };
    }
    return null;
  }

  // try to get device location once (best-effort)
  useEffect(() => {
    if (originMode !== "device") return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        (window as any).__device_location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      (err) => {
        console.warn("geolocation denied or error", err);
      },
      { maximumAge: 1000 * 30, timeout: 5000 }
    );
  }, [originMode]);

  // Determine poller origin list — when originMode is participant, we will use participantOrigin as the single origin for main route
  // But ETA poller still uses participants[] (drivers). The origin selector affects the "main route" (pickup -> destination) drawn
  const mainOrigin = computeOrigin();

  // Poller: participants feed into polling; destination used as target
  const poller = useEtaPoller({
    participants,
    destination,
    live,
    intervalMs: 5000,
    assumedSpeedKmph: 35,
  });

  useEffect(() => {
    setStatus(live ? "Live ON" : "Live OFF");
  }, [live]);

  // Pinned preview toggling: clicking a participant pins/unpins preview
  async function togglePinPreview(p: Participant) {
    try {
      if (pinnedPreview === p.id) {
        // unpin
        setPinnedPreview(null);
        if ((window as any).__trip_map_clearPreview) (window as any).__trip_map_clearPreview();
        setStatus(`Unpinned preview for ${p.name}`);
        return;
      }
      // pin this participant
      setPinnedPreview(p.id);
      // fetch and draw preview persistently
      const origin = `${p.lng},${p.lat}`;
      if (!destination) {
        setStatus("Select a destination first to generate preview.");
        return;
      }
      const destStr = `${destination.lng},${destination.lat}`;
      setStatus(`Pinning preview for ${p.name}...`);
      const routeResp = await fetchJson(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destStr)}`);
      const geojson = normalizeRouteToGeoJSON(routeResp?.data);
      if (geojson && (window as any).__trip_map_drawPreview) {
        (window as any).__trip_map_drawPreview(geojson);
      }
      setStatus(`Pinned preview for ${p.name}`);
    } catch (e: any) {
      console.error("pin preview error", e);
      setStatus("Pin preview failed: " + (e?.message ?? ""));
    }
  }

  // hover preview behavior: if pinnedPreview matches the hovered id, do nothing (keep pinned); otherwise show transient preview
  async function handleHoverIn(p: Participant) {
    setHovered(p.id);
    // if pinned for this participant, keep pinned preview (do nothing)
    if (pinnedPreview === p.id) return;
    if (!destination) return;
    // show transient preview
    try {
      const origin = `${p.lng},${p.lat}`;
      const destStr = `${destination.lng},${destination.lat}`;
      const routeResp = await fetchJson(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destStr)}`);
      const geojson = normalizeRouteToGeoJSON(routeResp?.data);
      if (geojson && (window as any).__trip_map_drawPreview) {
        (window as any).__trip_map_drawPreview(geojson);
      }
    } catch (e) {
      console.warn("hover preview error", e);
    }
  }

  async function handleHoverOut(p: Participant) {
    setHovered(null);
    // if pinned something else exists, keep it; otherwise clear preview
    if (pinnedPreview) {
      // there's a pinned preview; leave it
      return;
    }
    if ((window as any).__trip_map_clearPreview) (window as any).__trip_map_clearPreview();
  }

  // When destination or main origin changes, draw main route from chosen origin to destination
  useEffect(() => {
    async function drawMain() {
      if (!destination || !mainOrigin) return;
      try {
        setStatus("Drawing main route...");
        const originStr = `${mainOrigin.lng},${mainOrigin.lat}`;
        const destStr = `${destination.lng},${destination.lat}`;
        const r = await fetchJson(`/api/route?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`);
        const geojson = normalizeRouteToGeoJSON(r?.data);
        if (geojson && (window as any).__trip_map_drawRoute) (window as any).__trip_map_drawRoute(geojson);
        setStatus("Main route drawn");
      } catch (e) {
        console.warn("drawMain error", e);
        setStatus("Could not draw main route");
      }
    }
    drawMain();
  }, [destination, mainOrigin]);

  // Helper to show ETA text from poller.getSmoothed
  function getEtaText(id: string) {
    const sm = poller.getSmoothed(id);
    if (!sm) return "—";
    const s = Math.round(sm.etaSeconds);
    if (s < 60) return `${s}s`;
    return `${Math.round(s / 60)}m`;
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <DestinationSearch onSelect={(s) => setDestination({ lat: s.lat, lng: s.lon })} />
        </div>

        {/* Origin selector */}
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
            <TripMap />
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
                  onMouseEnter={() => handleHoverIn(p)}
                  onMouseLeave={() => handleHoverOut(p)}
                  onClick={() => togglePinPreview(p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 10,
                    borderRadius: 8, background: isPinned ? "#eef6ff" : (isHovered ? "#fbfbff" : "white"),
                    cursor: "pointer", border: isPinned ? "1px solid #5b9cff" : "1px solid #f3f3f3"
                  }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", background: "#ddd" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{p.name} {isPinned ? "📌" : ""}</div>
                    <div style={{ color: "#666" }}>{p.vehicle}</div>
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
              // clear pinned preview
              setPinnedPreview(null);
              if ((window as any).__trip_map_clearPreview) (window as any).__trip_map_clearPreview();
            }}>Clear pinned preview</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- helpers (same normalizers as earlier) ---------- */

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

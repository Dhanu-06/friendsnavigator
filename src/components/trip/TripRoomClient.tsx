
// src/components/trip/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useEtaPoller from "../../hooks/useEtaPoller";
import { fetchJson } from "@/lib/fetchJson";
import DestinationSearch from "../DestinationSearch.client";
import useTripRealtime from "@/hooks/useTripRealtime";
import { useUser } from "@/firebase/auth/use-user";
import TomTomMapController from "./TomTomMapController";
import RoutePolyline from "./RoutePolyline";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

type Participant = { id: string; name: string; vehicle?: string; lng: number; lat: number; };


export default function TripRoomClient({ tripId }: { tripId: string }) {
  const [live, setLive] = useState(true);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [status, setStatus] = useState("");
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

  // start poller
  const { lastPoll, getSmoothed } = useEtaPoller({
    participants: participants.filter(p => p.lat && p.lng) as any,
    destination,
    live,
    intervalMs: 5000,
    assumedSpeedKmph: 35,
  });
  
  useEffect(() => {
    if(tripDoc?.destination) {
      setDestination(tripDoc.destination);
    }
  }, [tripDoc]);


  useEffect(() => {
    setStatus(live ? "Live ON" : "Live OFF");
  }, [live]);

  function getEtaText(id: string) {
    const sm = getSmoothed(id);
    if (!sm) return "—";
    const s = Math.round(sm.etaSeconds);
    if (s < 60) return `${s}s`;
    return `${Math.round(s / 60)}m`;
  }
  
  const onDestinationSelected = (dest: { label: string; lng: number; lat: number; }) => {
    setDestination({ lat: dest.lat, lng: dest.lng, name: dest.label });
     // You can also persist this to the tripDoc if you want it to be saved
  }


  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <DestinationSearch onSelect={onDestinationSelected} />
        </div>
        <div>
          <label style={{ marginRight: 8 }}>
            Live
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} style={{ marginLeft: 8 }} />
          </label>
          <div style={{ fontSize: 12, color: "#666" }}>Last poll: {lastPoll ? new Date(lastPoll).toLocaleTimeString() : "—"}</div>
        </div>
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
            {participants.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, borderRadius: 8, background: "#fff" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: "#666" }}>{p.mode}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{getEtaText(p.id)}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>ETA</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

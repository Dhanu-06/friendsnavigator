// src/components/trip/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@/firebase/auth/use-user";
import useTripRealtime from "@/hooks/useTripRealtime";
import useLiveLocation from "@/hooks/useLiveLocation";
import useEtaPoller from "@/hooks/useEtaPoller";
import ChatPanel from "./ChatPanel.client";
import ExpensePanel from "./ExpensePanel.client";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

export default function TripRoomClient({ tripId }: { tripId: string }) {
  const { user, loading: userLoading } = useUser();

  const [live, setLive] = useState(true);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<"chat" | "expenses">("chat");

  const { tripDoc, participants, messages, expenses, sendMessage, addExpense, status: tripStatus, error: tripError } = useTripRealtime(tripId, user);
  const { lastPosition } = useLiveLocation(tripId, user, { enableWatch: true });

  const poller = useEtaPoller({
    participants: participants.filter(p => p.lat && p.lng),
    destination: tripDoc?.destination || null,
    live,
    intervalMs: 5000,
  });

  const getEtaText = (id: string) => {
    const sm = poller.getSmoothed(id);
    if (!sm) return "—";
    const s = Math.round(sm.etaSeconds);
    if (s < 60) return `${s}s`;
    return `${Math.round(s / 60)}m`;
  };

  const mainOrigin = useMemo(() => {
    if (tripDoc?.pickup) {
      return { lat: tripDoc.pickup.lat, lng: tripDoc.pickup.lng };
    }
    return null;
  }, [tripDoc]);


  useEffect(() => {
    // For main route drawing between origin and destination
    async function drawMainRoute() {
        if (!mainOrigin || !tripDoc?.destination || !(window as any).__trip_map_drawRoute) return;
        const originStr = `${mainOrigin.lng},${mainOrigin.lat}`;
        const destStr = `${tripDoc.destination.lng},${tripDoc.destination.lat}`;
        
        try {
            const res = await fetch(`/api/route?origin=${originStr}&destination=${destStr}`);
            const json = await res.json();
            if(json.ok && json.geojson) {
                (window as any).__trip_map_drawRoute({type: 'Feature', geometry: json.geojson});
            }
        } catch(e) {
            console.error("Failed to draw main route", e);
        }
    }
    drawMainRoute();
  }, [mainOrigin, tripDoc?.destination]);
  
  if (userLoading || tripStatus === 'connecting') {
    return <div>Loading Trip...</div>;
  }
  
  if (tripStatus === 'error' || !tripDoc) {
      return <div>Error loading trip: {tripError?.message || "Trip not found or permission denied."}</div>
  }

  return (
    <div style={{ padding: 12 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2>{tripDoc.name || `Trip Room - ${tripId}`}</h2>
            <label>
                <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
                Live ETA
            </label>
       </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 600 }}>
            <TripMap />
          </div>
        </div>

        <aside style={{ width: 420, borderLeft: "1px solid #eee", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 12 }}>
           <div>
            <h3 style={{ margin: '0 0 8px 0' }}>Participants</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {participants.map(p => {
                return (
                  <div key={p.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: 10,
                      borderRadius: 8, background: "white",
                      border: "1px solid #f3f3f3"
                    }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", background: "#ddd" }}>
                       <img src={p.avatarUrl} alt={p.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ color: "#666" }}>{p.mode || "Car"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>{getEtaText(p.id)}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>ETA</div>
                    </div>
                  </div>
                );
              })}
            </div>
           </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setTab("chat")} style={{ padding: "6px 10px", borderRadius: 6, background: tab === "chat" ? "#eef6ff" : "white", border: "1px solid #eee" }}>Chat</button>
            <button onClick={() => setTab("expenses")} style={{ padding: "6px 10px", borderRadius: 6, background: tab === "expenses" ? "#eef6ff" : "white", border: "1px solid #eee" }}>Expenses</button>
          </div>

          <div style={{ flex: 1, minHeight: 220 }}>
            {tab === "chat" ? <ChatPanel tripId={tripId} currentUserId={user?.uid} /> : <ExpensePanel tripId={tripId} currentUserId={user?.uid} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

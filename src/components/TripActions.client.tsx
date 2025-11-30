// src/components/TripActions.client.tsx
"use client";
import React, { useState } from "react";
import { fetchJson } from "../lib/fetchJson";
import { useRouter } from "next/navigation";

export default function TripActions({ tripId, status }: { tripId: string; status?: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function startTrip() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetchJson(`/api/trips/${encodeURIComponent(tripId)}/start`, { method: "POST" });
      if (res.ok) {
        setMsg("Trip started");
        // optionally refresh page or navigate
        setTimeout(() => {
          router.refresh();
        }, 400);
      } else {
        setMsg("Could not start trip: " + (res.error ?? "unknown"));
      }
    } catch (e: any) {
      setMsg("Error: " + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }

  function openTripRoom() {
    // navigate to the TripRoom page; keep it consistent with your routes
    router.push(`/trips/${encodeURIComponent(tripId)}/room`);
  }

  function joinTrip() {
    // placeholder — you can add join logic here (e.g. open modal, copy link, etc.)
    setMsg("Join trip clicked — implement join logic here");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <button onClick={openTripRoom} style={{ padding: "10px 12px", width: "100%", borderRadius: 8, background: "#2b8cff", color: "white", border: "none" }}>
          Open Trip Room
        </button>
      </div>

      <div>
        <button onClick={startTrip} disabled={loading || status === "started"} style={{ padding: "10px 12px", width: "100%", borderRadius: 8, background: status === "started" ? "#d1eaff" : "#2b8cff", color: "white", border: "none", opacity: status === "started" ? 0.9 : 1 }}>
          {status === "started" ? "Trip Started" : (loading ? "Starting..." : "Start Trip")}
        </button>
      </div>

      <div>
        <button onClick={joinTrip} style={{ padding: "10px 12px", width: "100%", borderRadius: 8 }}>
          Join Trip
        </button>
      </div>

      {msg && <div style={{ padding: 8, background: "#f6f9ff", borderRadius: 8 }}>{msg}</div>}
    </div>
  );
}

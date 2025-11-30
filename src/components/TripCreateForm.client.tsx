
// src/components/TripCreateForm.client.tsx
"use client";
import React, { useState } from "react";
import { fetchJson } from "../lib/fetchJson";

export type LatLng = { lat: number; lng: number; label?: string };

const TRANSPORT_MODES = [
  { id: "car", label: "Car / Taxi" },
  { id: "bike", label: "Bike" },
  { id: "transit", label: "Transit" },
  { id: "walk", label: "Walk" },
];

export default function TripCreateForm({
  ownerId,
  defaultOrigin,
  defaultDestination,
  onCreated,
}: {
  ownerId: string;
  defaultOrigin?: LatLng;
  defaultDestination?: LatLng;
  onCreated?: (tripId: string) => void;
}) {
  const [origin, setOrigin] = useState<LatLng | null>(defaultOrigin ?? null);
  const [destination, setDestination] = useState<LatLng | null>(defaultDestination ?? null);
  const [transport, setTransport] = useState<string | null>(TRANSPORT_MODES[0].id);
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // simple UI helpers to set origin/destination quickly in dev
  function fillSample() {
    setOrigin({ lat: 12.9716, lng: 77.5946, label: "Bangalore City" });
    setDestination({ lat: 12.9750, lng: 77.6050, label: "Sample Destination" });
  }

  async function createTrip() {
    setError(null);
    if (!ownerId) return setError("Missing ownerId");
    if (!origin || !destination) return setError("Please set origin and destination");

    setLoading(true);
    try {
      const payload = {
        ownerId,
        origin,
        destination,
        transportMode: transport,
      };
      const res = await fetchJson("/api/trips", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (res?.ok && res.id) {
        setSuccessId(res.id);
        setLoading(false);
        if (typeof onCreated === "function") onCreated(res.id);
      } else {
        setError((res && res.error) ? res.error : "Unknown server response");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, maxWidth: 780 }}>
      <h3 style={{ marginTop: 0 }}>Create Trip</h3>

      {!successId ? (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, color: "#666" }}>Origin</label>
              <input value={origin?.label ?? `${origin?.lat ?? ""}, ${origin?.lng ?? ""}` || ""} onChange={(e) => setOrigin({ ...(origin ?? { lat: 0, lng: 0 }), label: e.target.value })} placeholder="origin label/coords" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, color: "#666" }}>Destination</label>
              <input value={destination?.label ?? `${destination?.lat ?? ""}, ${destination?.lng ?? ""}` || ""} onChange={(e) => setDestination({ ...(destination ?? { lat: 0, lng: 0 }), label: e.target.value })} placeholder="destination label/coords" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={fillSample} style={{ padding: "8px 12px" }}>Fill sample</button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 8, color: "#444" }}>Choose transport</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TRANSPORT_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setTransport(m.id)}
                  disabled={loading}
                  aria-pressed={transport === m.id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: transport === m.id ? "2px solid #2b8cff" : "1px solid #eee",
                    background: transport === m.id ? "#eef6ff" : "white",
                    cursor: loading ? "not-allowed" : "pointer",
                    minWidth: 110,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={createTrip} disabled={loading} style={{ padding: "10px 14px", borderRadius: 8, background: "#2b8cff", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Creating..." : "Create Trip"}
            </button>
            <button onClick={() => { setOrigin(null); setDestination(null); setTransport(TRANSPORT_MODES[0].id); }} disabled={loading} style={{ padding: "8px 12px" }}>
              Reset
            </button>
            {error && <div style={{ color: "#b00020", marginLeft: 12 }}>{error}</div>}
          </div>
        </>
      ) : (
        // success banner
        <div style={{ padding: 12, borderRadius: 8, border: "1px solid #e6f0ff", background: "#f4fbff" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Your trip has been created successfully 🎉</div>
          <div style={{ marginBottom: 8 }}>Trip ID: <code>{successId}</code></div>
          <div style={{ display: "flex", gap: 8 }}>
            {/* quick action buttons after creating a trip */}
            <button onClick={() => { /* go to trip page or open trip room */ window.location.href = `/trips/${successId}`; }} style={{ padding: "8px 12px", borderRadius: 8 }}>Open Trip</button>
            <button onClick={() => { setSuccessId(null); setOrigin(null); setDestination(null); }} style={{ padding: "8px 12px", borderRadius: 8 }}>Create another trip</button>
          </div>
        </div>
      )}
    </div>
  );
}

// app/trips/[tripId]/page.tsx
import React from "react";
import TripActions from "@/components/TripActions.client";

type TripData = {
  id: string;
  ownerId?: string;
  origin?: { lat: number; lng: number; label?: string };
  destination?: { lat: number; lng: number; label?: string };
  transportMode?: string;
  metadata?: any;
  createdAt?: string;
  status?: string;
};

async function fetchTrip(tripId: string): Promise<{ ok: boolean; data?: TripData; error?: any }> {
  try {
    const url = `${process.env.NEXT_PUBLIC_APP_BASE ?? ""}/api/trips/${tripId}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    return json;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export default async function TripPage({ params }: { params: { tripId: string } }) {
  const id = params.tripId;
  const resp = await fetchTrip(id);
  const trip = resp.ok ? resp.data : null;

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>{trip?.metadata?.name ?? "Your Trip"}</h1>
        {!trip ? (
          <div style={{ padding: 12, border: "1px solid #f3f3f3", borderRadius: 8 }}>
            <strong>Trip not found</strong>
            <div style={{ marginTop: 8 }}>{resp.error ? String(resp.error) : "No trip data"}</div>
          </div>
        ) : (
          <>
            <section style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Trip ID</div>
                <div style={{ fontWeight: 700 }}>{trip.id}</div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Origin</div>
                  <div>{trip.origin?.label ?? `${trip.origin?.lat}, ${trip.origin?.lng}`}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Destination</div>
                  <div>{trip.destination?.label ?? `${trip.destination?.lat}, ${trip.destination?.lng}`}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Transport</div>
                  <div style={{ fontWeight: 700 }}>{trip.transportMode ?? "—"}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Status</div>
                  <div style={{ fontWeight: 700 }}>{trip.status ?? "unknown"}</div>
                </div>
              </div>

              <div style={{ width: 360 }}>
                <TripActions tripId={trip.id} status={trip.status} />
              </div>
            </section>

            <section style={{ border: "1px solid #f7f7f7", padding: 12, borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Trip details</h3>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#333" }}>{JSON.stringify(trip, null, 2)}</pre>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

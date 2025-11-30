// app/trips/[tripId]/room/page.tsx
import dynamic from "next/dynamic";
import React from "react";

const TripRoomClient = dynamic(() => import("@/components/trip/TripRoomClient"), { ssr: false });

export default function TripRoomPage({ params }: { params: { tripId: string } }) {
  // You can pass tripId as prop into TripRoomClient if you need it
  const tripId = params.tripId;
  return (
    <main style={{ padding: 12 }}>
      <h2>Trip Room — {tripId}</h2>
      <div style={{ height: "80vh", border: "1px solid #eee" }}>
        {/* If your TripRoomClient expects props, pass tripId; else it can fetch trip via API */}
        <TripRoomClient tripId={tripId} />
      </div>
    </main>
  );
}

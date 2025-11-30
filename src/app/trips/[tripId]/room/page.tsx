// app/trips/[tripId]/room/page.tsx
import dynamic from "next/dynamic";
import React from "react";

const TripRoomClient = dynamic(() => import("@/components/trip/TripRoomClient"), { ssr: false });

export default function TripRoomPage({ params }: { params: { tripId: string } }) {
  const tripId = params.tripId;
  return (
    <TripRoomClient tripId={tripId} />
  );
}

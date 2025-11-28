
// src/app/trips/[tripId]/page.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const TripRoomClient = dynamic(() => import('@/components/trip/TripRoomClient'), {
  ssr: false,
  loading: () => <div className="flex h-screen w-full items-center justify-center">Loading Trip...</div>,
});

export default function TripPage() {
  const params = useParams();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;

  if (!tripId) {
      return <div className="flex h-screen w-full items-center justify-center">Invalid Trip ID.</div>;
  }

  // The TripRoomClient now handles its own data fetching and real-time updates.
  // We just need to render it and pass the tripId.
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <TripRoomClient tripId={tripId} />
    </div>
  );
}

    
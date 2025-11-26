// src/app/trips/[tripId]/page.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/localAuth';
import TempEmuCheck from '@/components/TempEmuCheck';

const TripRoomClient = dynamic(() => import('@/components/trip/TripRoomClient'), { ssr: false });


export default function TripPage() {
  const params = useParams();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">You must be logged in to view a trip.</div>;
  }
  
  const user = {
      id: currentUser.uid,
      name: currentUser.name,
      avatar: `https://i.pravatar.cc/150?u=${currentUser.uid}`
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <TempEmuCheck />
      <TripRoomClient tripId={tripId} currentUser={user} />
    </div>
  );
}

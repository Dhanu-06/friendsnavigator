// src/app/trips/[tripId]/page.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/localAuth';

const TripRoomClient = dynamic(() => import('@/components/trip/TripRoomClient'), { ssr: false });


export default function TripPage() {
  const params = useParams();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const currentUser = getCurrentUser();

  if (!currentUser) {
    // In a real app, you might redirect to login
    // For this demo, we can proceed with a guest identity for location publishing
    const user = {
        id: 'guest-' + Math.random().toString(36).slice(2, 9),
        name: 'Guest',
        avatar: `https://i.pravatar.cc/150?u=guest`
    };
     return (
        <div style={{ width: '100%', height: '100vh' }}>
          <TripRoomClient tripId={tripId} currentUser={user} />
        </div>
      );
  }
  
  const user = {
      id: currentUser.uid,
      name: currentUser.name,
      avatar: `https://i.pravatar.cc/150?u=${currentUser.uid}`
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <TripRoomClient tripId={tripId} currentUser={user} />
    </div>
  );
}

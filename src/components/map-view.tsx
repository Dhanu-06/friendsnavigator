'use client';

import React from 'react';
import type { Participant, Location } from '@/lib/types';
import MapClient from './MapClient';

type MapViewProps = {
  participants: Participant[];
  locations: Record<string, Location>;
};

export function MapView({ participants, locations }: MapViewProps) {
  const firstLocatedUser = participants.find(p => locations[p.id]);
  
  const center = firstLocatedUser && locations[firstLocatedUser.id] 
    ? { lat: locations[firstLocatedUser.id].lat, lng: locations[firstLocatedUser.id].lng }
    : undefined; // Let MapClient use its default if no one has a location

  const friends = participants
    .filter(p => locations[p.id])
    .map(p => {
        const location = locations[p.id];
        return {
            id: p.id,
            lat: location.lat,
            lng: location.lng,
            name: p.name || 'User'
        };
    });

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapClient center={center} friends={friends} />
    </div>
  );
}


'use client';

import React from 'react';
import type { Participant, Location } from '@/lib/types';
import MapClient from './MapClient';

type MapViewProps = {
  participants: Participant[];
  locations: Record<string, Location>;
};

export function MapView({ participants, locations }: MapViewProps) {
  // Find the first participant with a location to center the map
  const firstLocatedUser = participants.find(p => locations[p.id]);
  const center = firstLocatedUser && locations[firstLocatedUser.id] 
    ? { lat: locations[firstLocatedUser.id].lat, lng: locations[firstLocatedUser.id].lng }
    : { lat: 12.9716, lng: 77.5946 }; // Default center (Bangalore)

  const markers = participants
    .filter(p => locations[p.id])
    .map(p => {
        const location = locations[p.id];
        return {
            id: p.id,
            lat: location.lat,
            lng: location.lng,
            title: p.name || 'User'
        };
    });

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapClient center={center} zoom={12} markers={markers} />
    </div>
  );
}

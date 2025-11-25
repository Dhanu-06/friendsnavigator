'use client';

import React from 'react';
import type { Participant, Location } from '@/lib/types';
import MapClient from './MapClient';

type MapViewProps = {
  participants: Participant[];
  locations: Record<string, Location>;
};

export function MapView(props: any) {
  return (
    <div className="w-full h-full">
      <MapClient {...props} />
    </div>
  );
}

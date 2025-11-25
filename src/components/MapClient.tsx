'use client';

import React from 'react';
import type { Map, Marker, Popup } from '@tomtom-international/web-sdk-maps';
// TomTom CSS must be imported at top-level in a client component
import '@tomtom-international/web-sdk-maps/dist/maps.css';

type FriendLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type MapClientProps = {
  center?: { lat: number; lng: number };
  zoom?: number;
  friends?: FriendLocation[];
};

export default function MapClient({
  center,
  zoom,
  friends = [],
}: MapClientProps) {
  return (
    <div className="w-full h-full min-h-[400px] rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="text-sm font-medium text-slate-700">
        Map integration placeholder
      </div>
      <div className="text-xs text-slate-500 max-w-xs text-center">
        The TomTom map is temporarily disabled while we debug errors.
        Your trip page and all other features still work.
      </div>
      {center && (
        <div className="text-[10px] text-slate-400">
          Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)} | Zoom: {zoom}
        </div>
      )}
      {friends.length > 0 && (
        <div className="text-[10px] text-slate-400">
          Friends on this trip: {friends.map((f) => f.name).join(', ')}
        </div>
      )}
    </div>
  );
}

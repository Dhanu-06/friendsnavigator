'use client';

import React from 'react';
import type { User, MeetingPoint } from '@/lib/types';
import { MOCK_DESTINATION } from '@/lib/data';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sparkles, MapPin } from 'lucide-react';

type MapViewProps = {
  users: User[];
  meetingPoint: MeetingPoint | null;
};

const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

export function MapView({ users, meetingPoint }: MapViewProps) {
  const center = MOCK_DESTINATION.location;

  return (
    <div className="h-full w-full">
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId="tripmate-map"
        styles={mapStyles}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
      >
        {users.map(user => (
          <AdvancedMarker key={user.id} position={user.location}>
            <div className="relative group">
              <Avatar className="h-12 w-12 border-2 border-primary shadow-lg transition-transform group-hover:scale-110">
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.avatarHint} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-background px-2 py-1 text-xs font-semibold shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                {user.name}
              </div>
            </div>
          </AdvancedMarker>
        ))}

        <AdvancedMarker position={MOCK_DESTINATION.location} zIndex={10}>
            <Pin background={'#3B82F6'} glyphColor={'#ffffff'} borderColor={'#ffffff'}>
                 <MapPin className="h-6 w-6" />
            </Pin>
        </AdvancedMarker>

        {meetingPoint?.location && (
          <AdvancedMarker position={meetingPoint.location}>
             <div className="relative group">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    <Sparkles className="h-6 w-6 text-accent-foreground" />
                </div>
                 <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-background px-2 py-1 text-xs font-semibold shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                    {meetingPoint.name}
                </div>
             </div>
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}

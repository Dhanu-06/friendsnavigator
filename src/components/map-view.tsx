'use client';

import React from 'react';
import type { Participant, MeetingPoint } from '@/lib/types';
import { MOCK_DESTINATION } from '@/lib/data';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sparkles, MapPin } from 'lucide-react';

type MapViewProps = {
  users: Participant[];
  meetingPoint: MeetingPoint | null;
};

// Dark mode map styles from Google Maps Style Wizard
const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];


export function MapView({ users, meetingPoint }: MapViewProps) {
  const center = MOCK_DESTINATION.location;

  return (
    <div className="h-full w-full">
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId="tripmate-dark"
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
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2 py-1 text-xs font-semibold shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                {user.name}
              </div>
            </div>
          </AdvancedMarker>
        ))}

        <AdvancedMarker position={MOCK_DESTINATION.location} zIndex={10}>
            <Pin background={'#1d4ed8'} glyphColor={'#ffffff'} borderColor={'#ffffff'}>
                 <MapPin className="h-6 w-6" />
            </Pin>
        </AdvancedMarker>

        {meetingPoint?.location && (
          <AdvancedMarker position={meetingPoint.location}>
             <div className="relative group">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    <Sparkles className="h-6 w-6 text-accent-foreground" />
                </div>
                 <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2 py-1 text-xs font-semibold shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                    {meetingPoint.name}
                </div>
             </div>
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}

import type { FieldValue } from 'firebase/firestore';

export type User = {
  id: string; // This will be the Firebase Auth UID
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  avatarHint?: string;
  lastLocation?: {
    lat: number;
    lng: number;
  };
  transportMode?: 'car' | 'bus' | 'train' | 'bike';
};

// This represents the data coming from the map/UI simulation, not directly from Firestore
export type Participant = {
  id: string;
  name: string;
  avatarUrl: string;
  avatarHint: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'moving' | 'delayed' | 'arrived';
  eta: number; // in minutes
  transport: 'car' | 'bus' | 'train' | 'bike';
};

export type Trip = {
  id: string;
  type: 'within-city' | 'out-of-city';
  destination: string;
  participantIds: string[];
  meetingPoint?: string;
  status: 'planned' | 'in-progress' | 'completed';
};

export type Message = {
  id: string;
  tripId: string;
  senderId: string;
  text: string;
  timestamp: FieldValue | Date | string; // Allow for server timestamp, client-side Date, or string
};

export type MeetingPoint = {
  name: string;
  reason: string;
  location?: {
    lat: number;
    lng: number;
  };
};

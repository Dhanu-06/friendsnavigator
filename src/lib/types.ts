import type { FieldValue, Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type Trip = {
  id: string;
  name: string;
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  description?: string;
  ownerId: string;
  participantIds: string[];
  tripType: 'within-city' | 'out-of-city';
};

export type Location = {
  id?: string;
  lat: number;
  lng: number;
  lastUpdated: FieldValue | Timestamp | Date;
};

export type TravelMode = 'ola' | 'uber' | 'rapido' | 'metro' | 'bmtc' | 'walk';
export type TravelPreference = 'fastest' | 'cheapest' | 'comfortable';

export type ModeOption = {
  mode: TravelMode;
  etaMinutes: number;
  costEstimate: number;
  explanation: string;
};

export type Participant = {
  id: string; // Same as user ID
  name: string;
  avatarUrl: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  preference?: TravelPreference;
  selectedMode?: TravelMode;
  suggestion?: {
    recommendedMode: TravelMode | null;
    options: ModeOption[];
    lastCalculatedAt: FieldValue | Timestamp | Date;
  };
};

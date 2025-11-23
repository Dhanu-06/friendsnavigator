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
  destination: string;
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

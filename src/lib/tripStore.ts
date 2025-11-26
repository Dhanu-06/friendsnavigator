// src/lib/tripStore.ts
export type Trip = {
  id: string;
  name: string;
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  tripType: 'within-city' | 'out-of-city';
  participants: any[]; // Consider defining a Participant type
  messages: any[];
  expenses: any[];
  createdAt?: number;
};

const TRIPS_STORAGE_KEY = 'friendsnavigator_trips';

function getTrips(): Record<string, Trip> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveTrip(trip: Trip) {
  const trips = getTrips();
  trips[trip.id] = trip;
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
}

export function getTripById(id: string): Trip | null {
  const trips = getTrips();
  return trips[id] ?? null;
}

export function getRecentTrips(): Trip[] {
    const trips = getTrips();
    return Object.values(trips).sort((a:any, b:any) => (b.createdAt || 0) - (a.createdAt || 0));
}

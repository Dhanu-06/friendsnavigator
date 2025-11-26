
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

export async function fetchTripByCode(code: string): Promise<Trip | null> {
  // This is an async function to mimic a real API call
  return Promise.resolve(getTripById(code));
}

export async function joinTrip(tripId: string, user: { id: string; name: string; avatarUrl?: string }): Promise<void> {
  const trips = getTrips();
  const trip = trips[tripId];
  
  if (!trip) {
    throw new Error("Trip not found. It may have been deleted.");
  }

  trip.participants = trip.participants || [];

  if (!trip.participants.some(p => p.id === user.id)) {
    trip.participants.push(user);
  }
  
  saveTrip(trip);
  
  return Promise.resolve();
}

export async function saveTripLocalOnly(tripId: string, data: Trip) {
  const raw = localStorage.getItem(TRIPS_STORAGE_KEY) || "{}";
  const map = JSON.parse(raw);
  map[tripId] = data;
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(map));
  return { source: "local" };
}

export function getTripLocal(tripId: string) {
  const raw = localStorage.getItem(TRIPS_STORAGE_KEY) || "{}";
  const map = JSON.parse(raw);
  return map[tripId] || null;
}

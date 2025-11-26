// src/lib/tripStore.ts
import { getTripLocal, saveTripLocal, getRecentTripsLocal, addParticipantLocal } from "./fallbackStore";
import { getTrip as getTripAdapter, saveTrip as saveTripAdapter, joinTrip as joinTripAdapter, getRecentTrips as getRecentTripsAdapter } from "./storeAdapter";


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

/**
 * @deprecated Use functions from storeAdapter.ts for robust fallback logic.
 */
export function saveTrip(trip: Trip) {
  saveTripAdapter(trip.id, trip);
}

/**
 * @deprecated Use functions from storeAdapter.ts for robust fallback logic.
 */
export function getTripById(id: string): Trip | null {
  // This is now a synchronous-only local getter.
  // For async operations with fallbacks, use the adapter.
  return getTripLocal(id);
}

/**
 * @deprecated Use functions from storeAdapter.ts for robust fallback logic.
 */
export function getRecentTrips(): Trip[] {
    return getRecentTripsLocal();
}

export async function fetchTripByCode(code: string): Promise<Trip | null> {
  const result = await getTripAdapter(code);
  return result.data;
}

export async function joinTrip(tripId: string, user: { id: string; name: string; avatarUrl?: string }): Promise<void> {
  await joinTripAdapter(tripId, user);
  return Promise.resolve();
}

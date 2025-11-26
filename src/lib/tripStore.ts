
// src/lib/tripStore.ts
import { getTripLocal, getRecentTripsLocal } from "./fallbackStore";
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
 * Saves a trip to the local fallback store synchronously.
 */
export function saveTrip(trip: Trip) {
  saveTripAdapter(trip.id, trip);
}

/**
 * @deprecated Use getTrip from storeAdapter.ts for robust fallback logic.
 * Gets a trip from the local fallback store synchronously.
 */
export function getTripById(id: string): Trip | null {
  return getTripLocal(id);
}

/**
 * @deprecated Use getRecentTrips from storeAdapter.ts for robust fallback logic.
 */
export function getRecentTrips(): Promise<Trip[]> {
    return getRecentTripsAdapter();
}

/**
 * Fetches a trip by its code, trying Firestore first and then falling back to local storage.
 * @param code The trip ID.
 * @returns A Trip object or null if not found.
 */
export async function fetchTripByCode(code: string): Promise<Trip | null> {
  const result = await getTripAdapter(code);
  return result.data;
}

/**
 * Joins a user to a trip, trying Firestore first and then falling back to local storage.
 * @param tripId The ID of the trip to join.
 * @param user The user object to add as a participant.
 */
export async function joinTrip(tripId: string, user: { id: string; name: string; avatarUrl?: string }): Promise<void> {
  await joinTripAdapter(tripId, user);
  return Promise.resolve();
}

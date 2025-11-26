// src/lib/fallbackStore.ts
export function readTripsLocal() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("trips") : "{}";
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.warn("readTripsLocal parse error", e);
    return {};
  }
}

export function writeTripsLocal(trips: Record<string, any>) {
  try {
    if (typeof window === "undefined") return false;
    localStorage.setItem("trips", JSON.stringify(trips));
    return true;
  } catch (e) {
    console.error("writeTripsLocal failed", e);
    return false;
  }
}

export function getTripLocal(tripId: string) {
  const map = readTripsLocal();
  return map[tripId] || null;
}

export function saveTripLocal(tripId: string, data: any) {
  const map = readTripsLocal();
  map[tripId] = { ...(map[tripId] || {}), ...data };
  writeTripsLocal(map);
  return map[tripId];
}

export function addParticipantLocal(tripId: string, participant: any) {
  const map = readTripsLocal();
  const trip = map[tripId] || { id: tripId, participants: [], createdAt: new Date().toISOString() };
  trip.participants = trip.participants || [];
  if (!trip.participants.some((p: any) => p.id === participant.id)) {
    trip.participants.push(participant);
  }
  map[tripId] = trip;
  writeTripsLocal(map);
  return trip;
}

export function getRecentTripsLocal(): any[] {
    const trips = readTripsLocal();
    return Object.values(trips).sort((a:any, b:any) => (b.createdAt || 0) - (a.createdAt || 0));
}

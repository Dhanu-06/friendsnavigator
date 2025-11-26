// lib/getParticipantETA.ts
export async function getETAForParticipant(userCoords: {lat: number, lon: number}, destinationCoords: {lat: number, lon: number}, apiKey: string) {
  if (!userCoords || !destinationCoords) return null;

  const start = `${userCoords.lat},${userCoords.lon}`;
  const end = `${destinationCoords.lat},${destinationCoords.lon}`;

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?key=${apiKey}&routeType=fastest&traffic=true&computeTravelTimeFor=all`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Routing ETA error", await res.text());
      return null;
    }
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      etaSeconds: route.summary.travelTimeInSeconds,
      distanceMeters: route.summary.lengthInMeters,
      points: route.legs?.[0]?.points || [],
    };
  } catch (e) {
    console.error("ETA fetch error", e);
    return null;
  }
}

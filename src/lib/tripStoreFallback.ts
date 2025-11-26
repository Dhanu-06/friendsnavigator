// lib/tripStoreFallback.ts
export async function saveTripLocalOnly(tripId: string, data: any) {
  const raw = localStorage.getItem("trips") || "{}";
  const map = JSON.parse(raw);
  map[tripId] = data;
  localStorage.setItem("trips", JSON.stringify(map));
  return { source: "local" };
}
export function getTripLocal(tripId: string) {
  const raw = localStorage.getItem("trips") || "{}";
  const map = JSON.parse(raw);
  return map[tripId] || null;
}

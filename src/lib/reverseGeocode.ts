// src/lib/reverseGeocode.ts
export async function reverseGeocodeClient(lat: number, lng: number) {
  try {
    const res = await fetch("/api/reverse-geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });
    const j = await res.json();
    if (res.ok && j?.address) return j.address;
    return null;
  } catch (e) {
    console.warn("reverseGeocodeClient failed", e);
    return null;
  }
}

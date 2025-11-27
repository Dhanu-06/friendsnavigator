// app/api/reverse-geocode/route.ts
import { NextResponse } from "next/server";

/**
 * GET /api/reverse-geocode
 * Query Params: lat, lng
 * Response: { address: string | null, raw?: any }
 *
 * Requires NEXT_TOMTOM_KEY in server env.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat & lng query parameters are required" }, { status: 400 });
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json({ error: "Invalid lat/lng values" }, { status: 400 });
    }

    const key = process.env.NEXT_TOMTOM_KEY || process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!key) return NextResponse.json({ error: "TomTom key not configured (NEXT_TOMTOM_KEY)" }, { status: 500 });

    const url = `https://api.tomtom.com/search/2/reverseGeocoding/${encodeURIComponent(latNum)},${encodeURIComponent(lngNum)}.json?key=${encodeURIComponent(
      key
    )}&language=en-GB&limit=1`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json({ error: "TomTom error", detail: txt }, { status: 502 });
    }
    const json = await resp.json();

    // TomTom returns `addresses` array; prefer freeformAddress or address.municipalitySubdivision + street
    let address = null;
    if (json && Array.isArray(json.addresses) && json.addresses.length > 0) {
      const a = json.addresses[0];
      address =
        a.address && a.address.freeformAddress
          ? a.address.freeformAddress
          : [
              a.address?.streetNumber,
              a.address?.streetName,
              a.address?.municipality,
              a.address?.countrySubdivision,
              a.address?.country,
            ]
              .filter(Boolean)
              .join(", ");
    }

    return NextResponse.json({ address: address ?? null, raw: json });
  } catch (e) {
    console.error("reverse-geocode error", e);
    return NextResponse.json({ error: "server error", detail: String(e) }, { status: 500 });
  }
}

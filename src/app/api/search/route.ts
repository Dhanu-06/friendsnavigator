// app/api/search/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: "missing query" }, { status: 400 });
    }

    const key = process.env.TOMTOM_KEY || process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!key) {
      return NextResponse.json({ error: "TOMTOM_KEY not set" }, { status: 500 });
    }

    // TomTom Search API: using "search" endpoint (v2/v1 names differ). Adjust if you use different version.
    const tomtomUrl = `https://api.tomtom.com/search/2/search.json?key=${key}&query=${encodeURIComponent(q)}&limit=6`;

    const r = await fetch(tomtomUrl);
    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: "TomTom search failed", details: text }, { status: 502 });
    }
    const data = JSON.parse(text);

    // Normalize results: pick id, address label, lat,lng
    const results = (data.results || []).map((it: any) => {
      // TomTom v2 returns 'position' with lat/lon, and 'address' with freeformAddress or label
      const pos = it.position || it.lat && it.lon ? { lat: it.lat, lon: it.lon } : it.position;
      const label = it.address?.freeformAddress ?? it.address?.municipality ?? it.poi?.name ?? it.type ?? it.name ?? it.address?.label ?? (it.address && Object.values(it.address).join(", "));
      return {
        id: it.id ?? it.poi?.id ?? `${pos?.lat},${pos?.lon}`,
        label: label || q,
        lat: pos?.lat,
        lon: pos?.lon,
        raw: it,
      };
    }).filter((r: any) => typeof r.lat === "number" && typeof r.lon === "number");

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("Search handler exception:", err);
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 500 });
  }
}

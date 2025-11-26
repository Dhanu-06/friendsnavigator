// app/api/matrix-eta/route.ts
import { NextResponse } from "next/server";

/**
 * POST /api/matrix-eta
 * Body: { origins: [{ id, lat, lon }], destination: { lat, lon } }
 *
 * Returns: { results: [{ id, etaSeconds, distanceMeters }, ...], raw?: any }
 *
 * NOTE: Put your server TomTom key in env as NEXT_TOMTOM_KEY (not public).
 */

type Origin = { id: string; lat: number; lon: number };
type Destination = { lat: number; lon: number };

async function tryMatrixAPI(origins: Origin[], destination: Destination, key: string) {
  // Build origins string: lat,lon|lat,lon|...
  const originsParam = origins.map((o) => `${o.lat},${o.lon}`).join("|");
  const destParam = `${destination.lat},${destination.lon}`;

  // TomTom Matrix endpoint — best-effort parameters. If your TomTom plan has different param names,
  // adjust metrics/model as required by TomTom docs.
  const url = `https://api.tomtom.com/routing/1/matrix?key=${encodeURIComponent(
    key
  )}&origins=${encodeURIComponent(originsParam)}&destinations=${encodeURIComponent(
    destParam
  )}&metrics=travelTimeInSeconds,distanceInMeters&resolve=none`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Matrix API failure: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data;
}

async function fallbackRouting(origins: Origin[], destination: Destination, key: string) {
  // If Matrix fails (due to account/plan issues), fallback by doing routing per-origin server-side.
  // This is slower but keeps client working.
  const results: { id: string; etaSeconds: number | null; distanceMeters: number | null }[] = [];
  for (const o of origins) {
    const start = `${o.lat},${o.lon}`;
    const end = `${destination.lat},${destination.lon}`;
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?key=${encodeURIComponent(
      key
    )}&routeType=fastest&traffic=true&computeTravelTimeFor=all`;
    try {
      const r = await fetch(url);
      if (!r.ok) {
        const txt = await r.text();
        console.warn("Routing fallback non-ok", r.status, txt);
        results.push({ id: o.id, etaSeconds: null, distanceMeters: null });
        continue;
      }
      const j = await r.json();
      const route = j.routes?.[0];
      const eta = route?.summary?.travelTimeInSeconds ?? null;
      const dist = route?.summary?.lengthInMeters ?? null;
      results.push({ id: o.id, etaSeconds: eta, distanceMeters: dist });
    } catch (e) {
      console.error("Routing fallback error", e);
      results.push({ id: o.id, etaSeconds: null, distanceMeters: null });
    }
  }
  return { results, raw: { fallback: true } };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origins: Origin[] = body.origins || [];
    const destination: Destination = body.destination;

    if (!origins || origins.length === 0) {
      return NextResponse.json({ results: [] });
    }
    if (!destination || typeof destination.lat !== "number") {
      return NextResponse.json({ error: "destination required" }, { status: 400 });
    }

    const key = process.env.NEXT_TOMTOM_KEY || process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!key) return NextResponse.json({ error: "TomTom key not configured (NEXT_TOMTOM_KEY)" }, { status: 500 });

    try {
      const matrixResp = await tryMatrixAPI(origins, destination, key);

      // Interpret matrix response. TomTom may return different shapes depending on plan.
      // We try a couple of likely shapes: either `matrix` with travelTimes / distances, or `matrix[0]` forms.
      const results: { id: string; etaSeconds: number | null; distanceMeters: number | null }[] = [];

      // Case A: response contains "matrix" with travelTimeInSeconds / distanceInMeters arrays
      if (matrixResp && matrixResp.matrix && (matrixResp.matrix.travelTimeInSeconds || matrixResp.matrix.travelTimes)) {
        const travelTimes = matrixResp.matrix.travelTimeInSeconds || matrixResp.matrix.travelTimes || [];
        const distances = matrixResp.matrix.distanceInMeters || matrixResp.matrix.distances || [];
        // travelTimes is typically a 2D array origins x destinations. Since we requested one destination, each origin has [value].
        for (let i = 0; i < origins.length; i++) {
          const tRow = travelTimes[i];
          const dRow = distances[i];
          const eta = Array.isArray(tRow) ? (tRow[0] ?? null) : tRow ?? null;
          const dist = Array.isArray(dRow) ? (dRow[0] ?? null) : dRow ?? null;
          results.push({ id: origins[i].id, etaSeconds: eta, distanceMeters: dist });
        }
        return NextResponse.json({ results, raw: matrixResp });
      }

      // Case B: some TomTom responses embed a 'matrix' array of objects
      if (matrixResp && matrixResp.matrix && Array.isArray(matrixResp.matrix)) {
        for (let i = 0; i < origins.length; i++) {
          const entry = matrixResp.matrix[i];
          const eta = entry?.travelTimeInSeconds ?? null;
          const dist = entry?.distanceInMeters ?? null;
          results.push({ id: origins[i].id, etaSeconds: eta, distanceMeters: dist });
        }
        return NextResponse.json({ results, raw: matrixResp });
      }

      // If structure unknown, return the raw response and let client-side fallback handle it.
      console.warn("Matrix response not in expected format, falling back to per-origin routing", matrixResp);
      const fallback = await fallbackRouting(origins, destination, key);
      return NextResponse.json(fallback);
    } catch (matrixErr) {
      console.warn("Matrix API failed, falling back to per-origin routing", matrixErr);
      const fallback = await fallbackRouting(origins, destination, key);
      return NextResponse.json(fallback);
    }
  } catch (e) {
    console.error("matrix-eta handler error", e);
    return NextResponse.json({ error: "server error", detail: String(e) }, { status: 500 });
  }
}

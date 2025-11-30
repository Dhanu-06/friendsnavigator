
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    console.info("[ETA-TELEMETRY]", body);
    // Optional: persist to Firestore if configured (not included here by default).
    // If you want Firestore, provide service account or set up admin SDK and I will add persistence.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Telemetry POST error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

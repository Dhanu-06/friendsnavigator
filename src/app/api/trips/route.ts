
// app/api/trips/route.ts
import { NextResponse } from "next/server";

async function getFirestoreSafe() {
  try {
    // lazy require to avoid client bundle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (!projectId || !clientEmail || !privateKey) {
        return null;
      }
      privateKey = privateKey.replace(/\\n/g, "\n");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    return admin.firestore();
  } catch (err) {
    console.warn("Firestore init failed (trips):", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "missing body" }, { status: 400 });

    // Expect fields: ownerId (string), origin {lat,lng,label}, destination {lat,lng,label}, transportMode (string)
    const { ownerId, origin, destination, transportMode, metadata } = body;
    if (!ownerId || !origin || !destination) {
      return NextResponse.json({ ok: false, error: "ownerId, origin and destination required" }, { status: 400 });
    }

    const firestore = await getFirestoreSafe();
    const doc = {
      ownerId,
      origin,
      destination,
      transportMode: transportMode ?? "not_specified",
      metadata: metadata ?? {},
      createdAt: new Date().toISOString(),
      ts: Date.now(),
      status: "created",
    };

    if (!firestore) {
      // Firestore not configured — return mock id and still succeed (useful for dev)
      const fakeId = "dev-trip-" + Math.random().toString(36).slice(2, 9);
      console.info("[TRIPS] Firestore not configured — returning fake id:", fakeId, doc);
      return NextResponse.json({ ok: true, id: fakeId, persisted: false, doc });
    }

    const ref = await firestore.collection("trips").add(doc);
    return NextResponse.json({ ok: true, id: ref.id, persisted: true });
  } catch (err: any) {
    console.error("Create trip error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

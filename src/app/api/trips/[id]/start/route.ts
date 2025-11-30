// app/api/trips/[id]/start/route.ts
import { NextResponse } from "next/server";

async function getFirestoreSafe() {
  try {
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
    console.warn("Firestore init failed (trips start):", err);
    return null;
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

    const firestore = await getFirestoreSafe();
    if (!firestore) {
      console.info("[TRIPS START] Firestore not configured — returning mock success");
      return NextResponse.json({ ok: true, id, persisted: false, status: "started" });
    }

    const ref = firestore.collection("trips").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const update = { status: "started", startedAt: new Date().toISOString(), startedTs: Date.now() };
    await ref.update(update);
    return NextResponse.json({ ok: true, id, persisted: true, updated: update });
  } catch (err: any) {
    console.error("Trip start error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

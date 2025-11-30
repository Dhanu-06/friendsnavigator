// app/api/trips/[id]/expenses/route.ts
import { NextResponse } from "next/server";

async function getFirestoreSafe() {
  try {
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (!projectId || !clientEmail || !privateKey) return null;
      privateKey = privateKey.replace(/\\n/g, "\n");
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    return admin.firestore();
  } catch (err) {
    console.warn("Firestore init failed (expenses):", err);
    return null;
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const tripId = params.id;
    if (!tripId) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

    const firestore = await getFirestoreSafe();
    if (!firestore) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const q = await firestore.collection("trips").doc(tripId).collection("expenses").orderBy("ts", "asc").limit(500).get();
    const items: any[] = [];
    q.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ ok: true, data: items });
  } catch (err: any) {
    console.error("Expenses GET error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const tripId = params.id;
    const body = await req.json().catch(() => null);
    if (!tripId || !body) return NextResponse.json({ ok: false, error: "missing payload" }, { status: 400 });

    const { authorId = "anon", amount, note } = body;
    const parsed = Number(amount);
    if (Number.isNaN(parsed) || parsed <= 0) return NextResponse.json({ ok: false, error: "invalid amount" }, { status: 400 });

    const doc = {
      authorId,
      amount: parsed,
      note: note ?? "",
      ts: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const firestore = await getFirestoreSafe();
    if (!firestore) {
      const fakeId = "dev-exp-" + Math.random().toString(36).slice(2, 9);
      return NextResponse.json({ ok: true, id: fakeId, persisted: false, data: doc });
    }

    const ref = await firestore.collection("trips").doc(tripId).collection("expenses").add(doc);
    return NextResponse.json({ ok: true, id: ref.id, persisted: true, data: doc });
  } catch (err: any) {
    console.error("Expenses POST error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

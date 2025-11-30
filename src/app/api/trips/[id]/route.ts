// app/api/trips/[id]/route.ts
import { NextResponse } from "next/server";

async function getFirestoreSafe() {
  try {
    // lazy-require to avoid client bundle issues
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
    console.warn("Firestore init failed (trips read):", err);
    return null;
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

    const firestore = await getFirestoreSafe();
    if (!firestore) {
      // fallback mock: return a consistent demo trip for dev
      const mock = {
        id,
        ownerId: "dev-user",
        origin: { lat: 12.9716, lng: 77.5946, label: "Pickup: Bangalore City" },
        destination: { lat: 12.9750, lng: 77.6050, label: "Destination: Example Place" },
        transportMode: "car",
        metadata: { name: "Demo Trip", description: "This is a dev fallback trip." },
        createdAt: new Date().toISOString(),
        status: "created",
      };
      return NextResponse.json({ ok: true, data: mock, persisted: false });
    }

    const doc = await firestore.collection("trips").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    const data = { id: doc.id, ...doc.data() };
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("Trip GET error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}


import { NextResponse } from "next/server";

/**
 * Server-side Firestore persistence for ETA telemetry.
 * - If FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY present,
 *   it initializes firebase-admin and writes telemetry documents to collection `eta_telemetry`.
 * - Otherwise it just logs to console (safe fallback).
 *
 * Security: this file runs server-side only.
 */

async function getFirestore() {
  // lazy load to avoid bundling firebase-admin into client builds
  // and to keep import only on server
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require("firebase-admin");

    if (!admin?.apps?.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        // Not configured
        return null;
      }

      // Some deployment platforms escape newlines; convert "\\n" into real newline
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
    console.warn("Failed to initialize firebase-admin:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    console.info("[ETA-TELEMETRY] Received:", body);
    // attempt to persist to Firestore
    const firestore = await getFirestore();
    if (!firestore) {
      console.info("[ETA-TELEMETRY] Firestore not configured — logged only.");
      return NextResponse.json({ ok: true, persisted: false });
    }

    // Prepare doc
    const doc = {
      payload: body ?? null,
      receivedAt: new Date().toISOString(),
      ts: Date.now(),
    };

    // write doc
    const ref = await firestore.collection("eta_telemetry").add(doc);
    console.info(`[ETA-TELEMETRY] persisted id=${ref.id}`);
    return NextResponse.json({ ok: true, persisted: true, id: ref.id });
  } catch (err: any) {
    console.error("Telemetry POST error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

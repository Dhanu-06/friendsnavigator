
"use client";
import { useEffect, useRef, useState } from "react";
import useEtaService from "./useEtaService";
import { fetchJson } from "../lib/fetchJson";

/**
 * useEtaPoller
 * - participants: array of { id, lat, lng }
 * - destination: { lat, lng } | null
 * - live: boolean (start/stop polling)
 * - options: { intervalMs, assumedSpeedKmph }
 *
 * Behavior:
 * - every interval: request matrix in batch for all participants -> destination
 * - if matrix returns no data for some participant: request route for that participant to extract distance and synthesize ETA
 * - blend matrix ETA + distance ETA (simple weighting) and call etaService.updateRaw(participantId, {etaSeconds, distanceMeters})
 * - calls telemetry endpoint with stats
 */
type ParticipantPos = { id: string; lat: number; lng: number };

export default function useEtaPoller({
  participants,
  destination,
  live,
  intervalMs = 5000,
  assumedSpeedKmph = 35,
}: {
  participants: ParticipantPos[];
  destination: { lat: number; lng: number } | null;
  live: boolean;
  intervalMs?: number;
  assumedSpeedKmph?: number;
}) {
  const etaService = useEtaService({ smoothingAlpha: 0.25, assumedSpeedKmph });
  const timerRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(0);
  const isPollingRef = useRef(false);
  const [lastPoll, setLastPoll] = useState<number | null>(null);

  useEffect(() => {
    if (!live || !destination || participants.length === 0) {
      stop();
      return;
    }
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, destination, participants.map(p => `${p.id}-${p.lat}-${p.lng}`).join("|")]);

  function start() {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    scheduleNext(0);
  }

  function stop() {
    isPollingRef.current = false;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleNext(delayMs: number) {
    if (!isPollingRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      runPoll().finally(() => {
        // schedule next with jitter/backoff
        const nextDelay = Math.min(Math.max(intervalMs, 1000), 30000) + (Math.random() * 400);
        scheduleNext(nextDelay);
      });
    }, delayMs);
  }

  async function runPoll() {
    if (!isPollingRef.current) return;
    if (!destination) return;
    if (participants.length === 0) return;

    const destStr = `${destination.lng},${destination.lat}`;
    const origins = participants.map(p => `${p.lng},${p.lat}`).join(";");
    try {
      // 1) Batch matrix call
      const url = `/api/matrix-eta?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destStr)}`;
      const startMs = Date.now();
      const matrixResp = await fetchJson(url);
      const duration = Date.now() - startMs;
      setLastPoll(Date.now());

      // parse results: map each participant index -> { travelTimeInSeconds, distanceInMeters }
      const parsed = parseMatrixResponse(matrixResp?.data, participants.length);
      // For participants without matrix result, fallback to route
      const missingIndexes = parsed
        .map((v: any, idx: number) => (v ? null : idx))
        .filter((v: any) => v !== null) as number[];

      // Collect direct route distances for missing participants (sequentially to avoid too many concurrent calls)
      for (const idx of missingIndexes) {
        const p = participants[idx];
        try {
          const r = await fetchJson(`/api/route?origin=${encodeURIComponent(`${p.lng},${p.lat}`)}&destination=${encodeURIComponent(destStr)}`);
          const distance = extractRouteDistanceMeters(r?.data);
          parsed[idx] = { travelTimeInSeconds: undefined, distanceInMeters: distance };
        } catch (e) {
          parsed[idx] = { travelTimeInSeconds: undefined, distanceInMeters: undefined };
        }
      }

      // Blend & update etaService for each participant
      parsed.forEach((item: any, idx: number) => {
        const p = participants[idx];
        const matrixETA = item?.travelTimeInSeconds;
        const dist = item?.distanceInMeters;
        const synthesized = synthesizeDistanceEta(dist, assumedSpeedKmph);
        const blended = blendEtas(matrixETA, synthesized);
        // If both missing, skip
        if (typeof blended === "number") {
          etaService.updateRaw(p.id, { etaSeconds: Math.round(blended), distanceMeters: dist });
        }
      });

      // send telemetry (non-blocking)
      safePostTelemetry({
        event: "matrix_poll_success",
        participantCount: participants.length,
        durationMs: duration,
        timestamp: Date.now(),
      }).catch(() => { /* ignore */ });

      // reset backoff on success
      backoffRef.current = 0;
    } catch (err: any) {
      console.error("useEtaPoller matrix error:", err);
      backoffRef.current = Math.min(5, backoffRef.current + 1);
      const delay = Math.min(30000, 1000 * Math.pow(2, backoffRef.current));
      // telemetry
      safePostTelemetry({ event: "matrix_poll_error", error: String(err?.message ?? err), timestamp: Date.now() }).catch(()=>{});
      scheduleNext(delay);
    }
  }

  // Helpers
  function synthesizeDistanceEta(distanceMeters?: number, speedKmph?: number) {
    if (typeof distanceMeters !== "number") return undefined;
    const speedMs = ((speedKmph ?? assumedSpeedKmph) * 1000) / 3600;
    const seconds = Math.max(1, Math.round(distanceMeters / Math.max(0.5, speedMs)));
    return seconds;
  }

  // Simple blending:
  // - If matrix ETA exists, use it but slightly bias towards distance estimate if they disagree widely (robustness)
  // - If matrix missing, use synthesized
  function blendEtas(matrixEta?: number, distanceEta?: number) {
    if (typeof matrixEta === "number" && typeof distanceEta === "number") {
      // weight by confidence: we trust matrix normally; compute relative difference
      const diffRatio = Math.abs(matrixEta - distanceEta) / Math.max(matrixEta, distanceEta, 1);
      // if diff small -> use matrix directly; if large -> average
      if (diffRatio < 0.2) return matrixEta;
      // otherwise average with small bias to matrix
      return Math.round(0.75 * matrixEta + 0.25 * distanceEta);
    }
    if (typeof matrixEta === "number") return matrixEta;
    if (typeof distanceEta === "number") return distanceEta;
    return undefined;
  }

  function parseMatrixResponse(matrixData: any, expectedCount: number) {
    // attempt to parse matrix response into an array length participants.length
    // returns array of { travelTimeInSeconds?, distanceInMeters? } or null entries
    try {
      if (!matrixData) return new Array(expectedCount).fill(null);
      // If matrix returns 'matrix' 2d with summaries: pick [i][0] (dest single)
      if (matrixData.matrix && Array.isArray(matrixData.matrix)) {
        // find first row values
        const arr = matrixData.matrix;
        return arr.map((row: any) => {
          const cell = Array.isArray(row) ? row[0] : row;
          if (!cell) return null;
          return {
            travelTimeInSeconds: cell.travelTimeInSeconds ?? cell.time ?? cell.durationInSeconds ?? undefined,
            distanceInMeters: cell.distanceInMeters ?? cell.distance ?? undefined,
          };
        });
      }
      // Some TomTom matrix responses put summaries in matrix.summaries
      if (matrixData.summaries && Array.isArray(matrixData.summaries)) {
        return matrixData.summaries.map((s: any) => ({
          travelTimeInSeconds: s.travelTimeInSeconds ?? s.duration ?? undefined,
          distanceInMeters: s.distanceInMeters ?? s.distance ?? undefined,
        }));
      }
      // fallback try to find numbers by walking
      const results = new Array(expectedCount).fill(null);
      (function walk(o: any) {
        if (!o || typeof o !== "object") return;
        if (typeof o.travelTimeInSeconds === "number" || typeof o.distanceInMeters === "number") {
          // best-effort place at first null slot
          const idx = results.findIndex(r => r === null);
          if (idx >= 0) results[idx] = { travelTimeInSeconds: o.travelTimeInSeconds, distanceInMeters: o.distanceInMeters };
        } else {
          for (const k of Object.keys(o)) walk(o[k]);
        }
      })(matrixData);
      return results;
    } catch (e) {
      console.warn("parseMatrixResponse error", e);
      return new Array(expectedCount).fill(null);
    }
  }

  function extractRouteDistanceMeters(routeData: any) {
    try {
      if (!routeData) return undefined;
      const r = routeData?.routes?.[0];
      if (!r) return undefined;
      if (r.summary?.lengthInMeters) return r.summary.lengthInMeters;
      if (r.summary?.distanceInMeters) return r.summary.distanceInMeters;
      if (r.distanceInMeters) return r.distanceInMeters;
      // search nested
      let found: number | undefined;
      (function walk(o: any) {
        if (found) return;
        if (o && typeof o === "object") {
          if (typeof o.distanceInMeters === "number") { found = o.distanceInMeters; return; }
          for (const k of Object.keys(o)) walk(o[k]);
        }
      })(r);
      return found;
    } catch (e) {
      return undefined;
    }
  }

  async function safePostTelemetry(obj: any) {
    try {
      await fetch("/api/eta-telemetry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(obj) });
    } catch {}
  }

  return { lastPoll, stop, start, getSmoothed: etaService.getSmoothed.bind(etaService) };
}

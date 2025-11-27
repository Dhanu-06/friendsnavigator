
"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
TomTomMapController.tsx

Client-only, SSR-safe TomTom map controller for Next.js App Router.

Props:
 - participants: Record<string, { id:string; name:string; lat:number; lng:number }>
 - computeRoutes?: boolean (when true, component polls /api/matrix-eta every 5s)
 - onParticipantETA?: (id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => void
 - followId?: string | null  (optional participant id to follow/center map on)
 - className?: string (optional wrapper className)

Notes:
 - Requires a client-exposed environment variable: NEXT_PUBLIC_TOMTOM_KEY
 - The component dynamically injects TomTom's <link> and <script>, so there are NO SSR imports.
 - Marker animation is implemented via linear interpolation and requestAnimationFrame.
*/

type Participant = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  participants: Record<string, Participant>;
  computeRoutes?: boolean;
  onParticipantETA?: (id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => void;
  followId?: string | null;
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
};

const TOMTOM_CSS = "https://api.tomtom.com/maps-sdk-for-web/6.x/6.31.0/maps/maps.css";
const TOMTOM_JS = "https://api.tomtom.com/maps-sdk-for-web/6.x/6.31.0/maps/maps-web.min.js";

export default function TomTomMapController({
  participants,
  computeRoutes = false,
  onParticipantETA,
  followId = null,
  className,
  initialCenter = { lat: 12.9716, lng: 77.5946 },
  initialZoom = 12,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const ttMapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const rafHandlesRef = useRef<Map<string, number>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  const TOMTOM_KEY = (process.env.NEXT_PUBLIC_TOMTOM_KEY as string) || "";

  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard

    // inject CSS
    if (!document.querySelector(`link[data-tt-css]`)) {
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", TOMTOM_CSS);
      link.setAttribute("data-tt-css", "");
      document.head.appendChild(link);
    }

    // inject JS
    if (!(window as any).tt) {
      if (!document.querySelector(`script[data-tt-sdk]`)) {
        const s = document.createElement("script");
        s.src = TOMTOM_JS;
        s.async = true;
        s.setAttribute("data-tt-sdk", "");
        s.onload = () => {
          initMapOnce();
        };
        document.body.appendChild(s);
      } else {
        // script exists but tt might not be ready yet
        const existing = document.querySelector(`script[data-tt-sdk]`);
        existing!.addEventListener("load", () => initMapOnce());
      }
    } else {
      // tt already loaded
      initMapOnce();
    }

    return () => {
      // cleanup on unmount
      stopPolling();
      // remove rafs
      rafHandlesRef.current.forEach((h) => cancelAnimationFrame(h));
      // remove markers
      markersRef.current.forEach((m) => {
        try {
          m.marker.remove();
        } catch (e) {}
      });
      // remove map
      if (ttMapRef.current) {
        try {
          ttMapRef.current.remove();
        } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // initialize map once tt is available
  function initMapOnce() {
    if (!(window as any).tt) return;
    if (!mapRef.current) return;
    if (ttMapRef.current) return; // already inited

    const tt = (window as any).tt;
    const map = tt.map({
      key: TOMTOM_KEY,
      container: mapRef.current,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
    });

    // basic controls
    map.addControl(new tt.NavigationControl());

    ttMapRef.current = map;
    setIsReady(true);
  }

  // Manage markers when participants change
  useEffect(() => {
    if (!isReady || !ttMapRef.current) return;
    const map = ttMapRef.current;

    const existingIds = new Set(markersRef.current.keys());
    const currentParticipants = Object.values(participants);

    // add/update markers
    currentParticipants.forEach((p) => {
      if (!p || !p.id) return;
      existingIds.delete(p.id);
      const existing = markersRef.current.get(p.id);
      
      const lat = p.lat;
      const lng = p.lng;
      if(typeof lat !== 'number' || typeof lng !== 'number') return;


      if (!existing) {
        // create DOM element for marker
        const el = document.createElement("div");
        el.className = "size-7 rounded-full flex items-center justify-center shadow-lg bg-background border-2 border-primary text-primary text-xs font-semibold";
        el.innerText = (p.name || "?").slice(0, 2).toUpperCase();

        const marker = new (window as any).tt.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);

        // popup
        const popupEl = document.createElement("div");
        popupEl.className = "p-2 text-sm font-semibold";
        popupEl.innerText = `${p.name}`;

        const popup = new (window as any).tt.Popup({ offset: 15 }).setDOMContent(popupEl);
        marker.setPopup(popup);

        markersRef.current.set(p.id, {
          marker,
          el,
          popupEl,
          current: { lat: lat, lng: lng },
        });
      } else {
        // update target coordinates for animation
        existing.target = { lat: lat, lng: lng };
        // if marker has a popup, update name
        if (existing.popupEl && !existing.popupEl.innerText.includes(p.name)) {
          existing.popupEl.innerText = p.name;
        }
      }
    });

    // remove markers not present anymore
    existingIds.forEach((id) => {
      const data = markersRef.current.get(id);
      if (data) {
        try {
          data.marker.remove();
        } catch (e) {}
        markersRef.current.delete(id);
        const raf = rafHandlesRef.current.get(id);
        if (raf) cancelAnimationFrame(raf);
        rafHandlesRef.current.delete(id);
      }
    });

    // start animation loop for any marker with a target
    markersRef.current.forEach((data, id) => {
      if (!rafHandlesRef.current.get(id)) {
        const loop = () => {
          const now = performance.now();
          const { current, target } = data;
          if (!target) {
            // nothing to do
            const handle = requestAnimationFrame(loop);
            rafHandlesRef.current.set(id, handle);
            return;
          }

          const speed = 0.12; // proportion to move per frame (tweak for smoothness)
          const latDiff = target.lat - current.lat;
          const lngDiff = target.lng - current.lng;

          // if very close, snap
          if (Math.abs(latDiff) < 1e-6 && Math.abs(lngDiff) < 1e-6) {
            current.lat = target.lat;
            current.lng = target.lng;
            try {
              data.marker.setLngLat([current.lng, current.lat]);
            } catch (e) {}
            // clear target
            delete data.target;
            const handle = requestAnimationFrame(loop);
            rafHandlesRef.current.set(id, handle);
            return;
          }

          // linear interpolation
          current.lat += latDiff * speed;
          current.lng += lngDiff * speed;

          try {
            data.marker.setLngLat([current.lng, current.lat]);
          } catch (e) {}

          const handle = requestAnimationFrame(loop);
          rafHandlesRef.current.set(id, handle);
        };

        const handle = requestAnimationFrame(loop);
        rafHandlesRef.current.set(id, handle);
      }
    });

    // optionally center map on followId
    if (followId && markersRef.current.has(followId)) {
      const d = markersRef.current.get(followId);
      if (d && d.current) {
        try {
          map.easeTo({ center: [d.current.lng, d.current.lat], duration: 700 });
        } catch (e) {}
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, isReady, followId]);

  // Polling /api/matrix-eta every 5s when computeRoutes is true
  useEffect(() => {
    if (!isReady) return;

    if (computeRoutes) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeRoutes, isReady, participants]);

  function startPolling() {
    if (pollIntervalRef.current) return; // already polling

    // run immediately and then every 5s
    fetchAndDispatchETAs();
    const id = window.setInterval(fetchAndDispatchETAs, 5000);
    pollIntervalRef.current = id as unknown as number;
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current as number);
      pollIntervalRef.current = null;
    }
  }

  async function fetchAndDispatchETAs() {
    try {
      // prepare participants payload (array)
      const list = Object.values(participants).filter(p => p && typeof p.lat === 'number').map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }));
      if (list.length === 0) return;

      const res = await fetch("/api/matrix-eta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: list }),
      });

      if (!res.ok) {
        // try to parse body for debugging but don't throw
        try { await res.text(); } catch (_) {}
        return;
      }

      const json = await res.json();
      if (!json) return;

      /**
       * Supported response shapes (in order of detection):
       *
       * 1) { etas: { "<id>": { etaSeconds, distanceMeters } } }
       * 2) { results: [{ id, etaSeconds, distanceMeters }, ...] }
       * 3) [{ id, etaSeconds, distanceMeters }, ...]    (array)
       * 4) { "<id>": { etaSeconds, distanceMeters }, ... }  (top-level map)
       *
       * The code below detects which one we got and normalizes it to a map.
       */
      let normalized: Record<string, { etaSeconds: number | null; distanceMeters: number | null }> = {};

      // Case 1: json.etas as map
      if (json.etas && typeof json.etas === "object" && !Array.isArray(json.etas)) {
        Object.entries(json.etas).forEach(([id, val]) => {
          if (!val) return;
          normalized[id] = {
            etaSeconds: typeof (val as any).etaSeconds === "number" ? (val as any).etaSeconds : (val as any).durationSeconds ?? null,
            distanceMeters: typeof (val as any).distanceMeters === "number" ? (val as any).distanceMeters : (val as any).distance ?? null,
          } as any;
        });
      }
      // Case 2: json.results array of objects
      else if (Array.isArray(json.results)) {
        json.results.forEach((it: any) => {
          if (!it || !it.id) return;
          normalized[it.id] = {
            etaSeconds: it.etaSeconds ?? it.durationSeconds ?? it.duration ?? null,
            distanceMeters: it.distanceMeters ?? it.distance ?? null,
          };
        });
      }
      // Case 3: top-level array
      else if (Array.isArray(json)) {
        json.forEach((it: any) => {
          if (!it || !it.id) return;
          normalized[it.id] = {
            etaSeconds: it.etaSeconds ?? it.durationSeconds ?? it.duration ?? null,
            distanceMeters: it.distanceMeters ?? it.distance ?? null,
          };
        });
      }
      // Case 4: top-level map keyed by id
      else if (typeof json === "object") {
        // detect if object keys look like ids mapped to value objects
        const maybeIds = Object.keys(json);
        if (maybeIds.length > 0 && typeof json[maybeIds[0]] === "object") {
            const firstVal = json[maybeIds[0]];
            const looksLikeMap = firstVal.hasOwnProperty('etaSeconds') || firstVal.hasOwnProperty('distanceMeters') || firstVal.hasOwnProperty('duration');
            if (looksLikeMap) {
                Object.entries(json).forEach(([id, val]) => {
                if (!val) return;
                normalized[id] = {
                    etaSeconds: (val as any).etaSeconds ?? (val as any).durationSeconds ?? (val as any).duration ?? null,
                    distanceMeters: (val as any).distanceMeters ?? (val as any).distance ?? null,
                } as any;
                });
            }
        }
      }

      // Now dispatch normalized map to onParticipantETA + update popups
      Object.entries(normalized).forEach(([id, val]) => {
        try {
          // only call when values exist (allow 0)
          if (val && (typeof val.etaSeconds === "number" || typeof val.distanceMeters === "number")) {
            onParticipantETA && onParticipantETA(id, { etaSeconds: val.etaSeconds ?? null, distanceMeters: val.distanceMeters ?? null });
          }

          // update popup text if marker exists
          const data = markersRef.current.get(id);
          if (data && data.popupEl) {
            // preserve name (left of '|') if present else just name
            const baseName = (participants[id] && participants[id].name) || data.popupEl.innerText.split("|", 1)[0].trim();
            const etaText = (typeof val.etaSeconds === "number") ? formatETA(val.etaSeconds) : "--";
            data.popupEl.innerHTML = `<div class="font-semibold">${baseName}</div><div class="text-xs text-muted-foreground">ETA: ${etaText}</div>`;
          }
        } catch (e) {
          // swallow per-participant errors to avoid breaking the whole loop
        }
      });

    } catch (e) {
      // swallow errors silently in polling to avoid noisy console in production
      // console.warn("ETA poll error", e);
    }
  }

  function formatETA(s: number | null | undefined) {
    if (!s && s !== 0) return "--";
    const mins = Math.round((s as number) / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m`;
  }

  return (
    <div className={cn("w-full h-full relative", className)}>
      <div ref={mapRef} className="w-full h-full" />
      {/* optional: show small readiness indicator */}
      {!isReady && (
        <div className="absolute left-2 top-2 bg-background/80 backdrop-blur-sm p-2 rounded-md text-xs shadow-md">
          Loading map...
        </div>
      )}
    </div>
  );
}

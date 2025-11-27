// src/components/trip/TomTomMapController.tsx
"use client";

import React, { useEffect, useRef } from "react";

type LatLng = { lat: number; lon: number };
type Participant = { id: string; name?: string; avatar?: string | null; coords?: LatLng; lat?: number; lng?: number; };

type Props = {
  origin?: any;
  destination?: any;
  participants?: Participant[] | Record<string, Participant>;
  // If true, the controller will call /api/matrix-eta for ETAs and show them on popups
  computeRoutes?: boolean;
  // called when ETA for a participant is known: (id, {etaSeconds, distanceMeters})
  onParticipantETA?: (id: string, info: { etaSeconds: number | null; distanceMeters: number | null }) => void;
  style?: React.CSSProperties;
  followId?: string | null;
  initialCenter?: { lat: number, lng: number };
  initialZoom?: number;
};

/**
 * TomTomMapController
 *
 * - Dynamically loads TomTom Web SDK at runtime (client-only).
 * - Creates markers for participants and smoothly interpolates them.
 * - Periodically queries /api/matrix-eta for travel times to destination (if computeRoutes=true).
 *
 * Notes:
 * - Requires NEXT_TOMTOM_KEY server env for server routes;
 *   for client map tiles the controller reads NEXT_PUBLIC_TOMTOM_KEY if set.
 * - Avoids SSR import to prevent `self is not defined` errors.
 */

function ensureTomTomScript(): Promise<void> {
  // If already loaded
  // @ts-ignore
  if (typeof window !== "undefined" && (window as any).tt && (window as any).tt.map) {
    return Promise.resolve();
  }

  const existing = document.querySelector('script[data-tt-sdk="true"]') as HTMLScriptElement | null;
  if (existing) {
    return new Promise((res) => {
      existing.addEventListener("load", () => res());
      existing.addEventListener("error", () => res());
    });
  }

  // Insert CSS (safe to insert duplicate; browser ignores duplicates)
  const cssHref =
    "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.15.0/maps/maps.css"; // CDN CSS (works with many TomTom SDK versions)
  if (!document.querySelector(`link[href="${cssHref}"]`)) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = cssHref;
    document.head.appendChild(l);
  }

  // Insert script tag
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.setAttribute("data-tt-sdk", "true");
    // A common public CDN path; if your environment needs a different version, you can change this.
    s.src = "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.15.0/maps/maps-web.min.js";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      // small delay to ensure tt is registered
      setTimeout(() => resolve(), 50);
    };
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

function latLonToArray(c?: LatLng) {
  if (!c) return undefined;
  // TomTom expects [lon, lat] in some APIs; for map marker we use {lat, lng}
  return { lat: c.lat, lng: c.lon };
}

export default function TomTomMapController({
  origin,
  destination,
  participants: participantsProp = [],
  computeRoutes = false,
  onParticipantETA,
  style,
  followId,
  initialCenter = { lat: 12.9716, lng: 77.5946 },
  initialZoom = 12,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const popupRef = useRef<Map<string, any>>(new Map());
  const animationRefs = useRef<Map<string, number>>(new Map());
  const matrixTimerRef = useRef<number | null>(null);

  const participants = useMemo(() => {
    return Array.isArray(participantsProp) ? participantsProp : Object.values(participantsProp);
  }, [participantsProp]);

  // Smoothly move marker from start to end in ms duration
  function animateMarker(marker: any, from: { lat: number; lng: number }, to: { lat: number; lng: number }, duration = 900) {
    // cancel previous animation
    const prev = animationRefs.current.get(marker._id || marker.getElement()?.dataset?.id ?? "");
    if (prev) cancelAnimationFrame(prev);

    const start = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      // simple linear interpolation
      const lat = from.lat + (to.lat - from.lat) * t;
      const lng = from.lng + (to.lng - from.lng) * t;
      try {
        marker.setLngLat([lng, lat]);
      } catch (e) {
        // ignore
      }
      if (t < 1) {
        const raf = requestAnimationFrame(step);
        animationRefs.current.set(marker._id || marker.getElement()?.dataset?.id ?? "", raf);
      } else {
        animationRefs.current.delete(marker._id || marker.getElement()?.dataset?.id ?? "");
      }
    }
    requestAnimationFrame(step);
  }

  // Upsert marker for participant
  function upsertParticipantMarker(tt: any, p: Participant) {
    const lat = p.coords?.lat ?? p.lat;
    const lon = p.coords?.lon ?? p.lng;
    if (typeof lat !== 'number' || typeof lon !== 'number') return;
    
    const id = p.id;
    const existing = markersRef.current.get(id);
    const latlng = { lat: lat, lng: lon };
    if (existing) {
      // animate to new pos
      try {
        const current = existing.getLngLat ? existing.getLngLat() : { lat: latlng.lat, lng: latlng.lng };
        animateMarker(existing, { lat: current.lat, lng: current.lng }, latlng, 1200);
      } catch {
        existing.setLngLat([latlng.lng, latlng.lat]);
      }
      // update popup content (name)
      const pop = popupRef.current.get(id);
      if (pop) {
        pop.setHTML(`<div style="font-weight:700">${p.name ?? "Friend"}</div><div style="font-size:12px">Updating…</div>`);
      }
    } else {
      // create a DOM element for marker (circle with initials)
      const el = document.createElement("div");
      el.className = "tt-marker";
      el.style.width = "40px";
      el.style.height = "40px";
      el.style.borderRadius = "20px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.color = "#fff";
      el.style.fontWeight = "700";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
      el.style.background = "#3b82f6";
      el.style.border = "2px solid white";
      el.dataset.id = id;

      // initials
      const initials = (p.name || p.id || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
      el.textContent = initials;

      // create marker
      const marker = new tt.Marker({ element: el }).setLngLat([latlng.lng, latlng.lat]).addTo(mapRef.current);
      // store id on marker for animations
      (marker as any)._id = id;
      markersRef.current.set(id, marker);

      // popup
      const popup = new tt.Popup({ offset: 25 }).setHTML(`<div style="font-weight:700">${p.name ?? "Friend"}</div><div style="font-size:12px">ETA: —</div>`);
      popupRef.current.set(id, popup);
      marker.setPopup(popup);
    }
  }

  // Remove markers not in participants
  function cleanupMarkers(pIds: string[]) {
    for (const [id, marker] of markersRef.current.entries()) {
      if (!pIds.includes(id)) {
        try {
          marker.remove();
        } catch {}
        markersRef.current.delete(id);
        const p = popupRef.current.get(id);
        if (p) {
          try {
            p.remove();
          } catch {}
        }
        popupRef.current.delete(id);
      }
    }
  }

  // Call matrix endpoint server-side via our API to get ETAs to destination
  async function fetchETAs(origins: { id: string; lat: number; lng: number }[], dest: { lat: number; lng: number }) {
    try {
      const res = await fetch("/api/matrix-eta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origins, destination: dest }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn("matrix-eta failed", res.status, txt);
        return null;
      }
      const j = await res.json();
      return j;
    } catch (e) {
      console.warn("matrix-eta request error", e);
      return null;
    }
  }

  // Update popup text for ETA
  function updateETAPopups(matrixJson: any) {
    if (!matrixJson) return;
    const results = matrixJson.results || matrixJson.raw?.results || matrixJson.matrix || null;
    // Try to read results array
    if (Array.isArray(matrixJson.results)) {
      for (const r of matrixJson.results) {
        const id = r.id;
        const participant = participants.find(p => p.id === id);
        const name = participant?.name || id;
        const etaSec = r.etaSeconds ?? null;
        const dist = r.distanceMeters ?? null;
        const pop = popupRef.current.get(id);
        if (pop) {
          const etaText = etaSec ? `${Math.round(etaSec / 60)} min` : "—";
          pop.setHTML(`<div style="font-weight:700">${name}</div><div style="font-size:12px">ETA: ${etaText}</div><div style="font-size:11px;color:#666">${dist ? `${(dist/1000).toFixed(1)} km` : ""}</div>`);
        }
        if (onParticipantETA) onParticipantETA(id, { etaSeconds: etaSec, distanceMeters: dist });
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!containerRef.current) return;
      try {
        await ensureTomTomScript();
      } catch (e) {
        console.error("Failed to load TomTom SDK", e);
        return;
      }
      // @ts-ignore
      const tt = (window as any).tt;
      if (!tt) {
        console.error("TomTom SDK not available on window.tt");
        return;
      }

      // pick key from PUBLIC env when client needs tiles
      const clientKey = (process.env.NEXT_PUBLIC_TOMTOM_KEY) as string | undefined;
      if (!clientKey) {
        console.warn("No TomTom client key found in NEXT_PUBLIC_TOMTOM_KEY. Map tiles might not load correctly.");
      }

      const map = tt.map({
        key: clientKey || "",
        container: containerRef.current,
        center: [initialCenter.lng, initialCenter.lat],
        zoom: initialZoom,
      });

      mapRef.current = map;

      // Add fullscreen and navigation controls
      map.addControl(new tt.NavigationControl());
      map.addControl(new tt.FullscreenControl());

      // If destination is provided, add a destination marker
      if (destination?.coords) {
        try {
          new tt.Marker({ color: "#ef4444" }).setLngLat([destination.coords.lon, destination.coords.lat]).addTo(map);
        } catch (e) {}
      }

      // Matrix polling for ETAs
      async function matrixLoop() {
        if (cancelled || !computeRoutes) return;

        const pOrigins = participants.map(p => ({
          id: p.id,
          lat: p.coords?.lat ?? p.lat,
          lng: p.coords?.lon ?? p.lng,
        })).filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');

        const dest = destination?.coords ? { lat: destination.coords.lat, lng: destination.coords.lon } : null;

        if (pOrigins.length === 0 || !dest) {
          matrixTimerRef.current = window.setTimeout(matrixLoop, 5000);
          return;
        }

        const j = await fetchETAs(pOrigins, dest);
        if (j) updateETAPopups(j);

        matrixTimerRef.current = window.setTimeout(matrixLoop, 5000);
      }

      // Start matrix loop
      if (computeRoutes) {
        matrixLoop().catch((e) => console.warn("matrixLoop err", e));
      }

      // Cleanup on unmount
      return () => {
        cancelled = true;
        if (matrixTimerRef.current) clearTimeout(matrixTimerRef.current);
        if (mapRef.current) {
          try { mapRef.current.remove(); } catch {}
          mapRef.current = null;
        }
      };
    }

    setup();

    return () => {
      for (const a of animationRefs.current.values()) cancelAnimationFrame(a);
      animationRefs.current.clear();
      if (matrixTimerRef.current) clearTimeout(matrixTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeRoutes, destination]);

  // Update markers when participants prop changes
  useEffect(() => {
    // @ts-ignore
    const tt = (window as any).tt;
    if (!tt || !mapRef.current) return;
    
    const pIds = participants.map((p) => p.id);
    for (const p of participants) {
      upsertParticipantMarker(tt, p);
    }
    cleanupMarkers(pIds);

    const pToFollow = followId ? participants.find(p => p.id === followId) : undefined;
    const followCoords = pToFollow?.coords ?? pToFollow;

    if (followCoords && typeof followCoords.lat === 'number' && mapRef.current) {
      mapRef.current.panTo([followCoords.lng ?? followCoords.lon, followCoords.lat], { duration: 1000 });
    } else if (participants.length > 0) {
      const coords = participants
        .map((p) => {
            const lat = p.coords?.lat ?? p.lat;
            const lon = p.coords?.lon ?? p.lng;
            return (typeof lat === 'number' && typeof lon === 'number') ? [lon, lat] : null;
        })
        .filter(Boolean) as [number, number][];

      if (destination?.coords) coords.push([destination.coords.lon, destination.coords.lat]);
      
      if (coords.length > 0) {
          try {
            const bounds = coords.reduce((b: any, c) => b.extend(c), new tt.LngLatBounds(coords[0], coords[0]));
            if(mapRef.current) mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15 });
          } catch(e) {}
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, followId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 420, ...style }} />;
}

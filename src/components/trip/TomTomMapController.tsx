import React, { useEffect, useRef, useState } from "react";

/*
TomTomMapController.tsx
Client-only, SSR-safe TomTom map controller for Next.js App Router.
*/

type Participant = {
  id: string;
  name?: string;
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
    if (typeof window === "undefined") return;

    if (!document.querySelector(`link[data-tt-css]`)) {
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", TOMTOM_CSS);
      link.setAttribute("data-tt-css", "");
      document.head.appendChild(link);
    }

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
        const existing = document.querySelector(`script[data-tt-sdk]`);
        existing!.addEventListener("load", () => initMapOnce());
      }
    } else {
      initMapOnce();
    }

    return () => {
      stopPolling();
      rafHandlesRef.current.forEach((h) => cancelAnimationFrame(h));
      markersRef.current.forEach((m) => {
        try {
          m.marker.remove();
        } catch (e) {}
      });
      if (ttMapRef.current) {
        try {
          ttMapRef.current.remove();
        } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMapOnce() {
    if (!(window as any).tt) return;
    if (!mapRef.current) return;
    if (ttMapRef.current) return;

    const tt = (window as any).tt;
    const map = tt.map({
      key: TOMTOM_KEY,
      container: mapRef.current,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
    });

    map.addControl(new tt.NavigationControl());

    ttMapRef.current = map;
    setIsReady(true);
  }

  useEffect(() => {
    if (!isReady || !ttMapRef.current) return;
    const map = ttMapRef.current;

    const existingIds = new Set(markersRef.current.keys());

    Object.values(participants).forEach((p) => {
      existingIds.delete(p.id);
      const existing = markersRef.current.get(p.id);
      if (!existing) {
        const el = document.createElement("div");
        el.className = "tt-participant-marker";
        el.style.width = "28px";
        el.style.height = "28px";
        el.style.borderRadius = "50%";
        el.style.display = "flex";
        el.style.justifyContent = "center";
        el.style.alignItems = "center";
        el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        el.style.background = "white";
        el.style.border = "2px solid #1E90FF";
        el.style.fontSize = "12px";
        el.style.fontWeight = "600";
        el.style.color = "#1E90FF";
        el.innerText = (p.name || "?").slice(0, 2).toUpperCase();

        const marker = new (window as any).tt.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);

        const popupEl = document.createElement("div");
        popupEl.className = "tt-popup-content";
        popupEl.style.padding = "6px 8px";
        popupEl.style.fontSize = "13px";
        popupEl.innerText = `${p.name || "Unknown"}`;

        const popup = new (window as any).tt.Popup({ offset: 10 }).setDOMContent(popupEl);
        marker.setPopup(popup);

        markersRef.current.set(p.id, {
          marker,
          el,
          popupEl,
          current: { lat: p.lat, lng: p.lng },
        });
      } else {
        existing.target = { lat: p.lat, lng: p.lng };
        if (existing.popupEl && existing.popupEl.innerText !== p.name) {
          existing.popupEl.innerText = p.name || "Unknown";
        }
      }
    });

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

    markersRef.current.forEach((data, id) => {
      if (!rafHandlesRef.current.get(id)) {
        const loop = () => {
          const { current, target } = data;
          if (!target) {
            const handle = requestAnimationFrame(loop);
            rafHandlesRef.current.set(id, handle);
            return;
          }

          const speed = 0.12;
          const latDiff = target.lat - current.lat;
          const lngDiff = target.lng - current.lng;

          if (Math.abs(latDiff) < 1e-6 && Math.abs(lngDiff) < 1e-6) {
            current.lat = target.lat;
            current.lng = target.lng;
            try {
              data.marker.setLngLat([current.lng, current.lat]);
            } catch (e) {}
            delete data.target;
            const handle = requestAnimationFrame(loop);
            rafHandlesRef.current.set(id, handle);
            return;
          }

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

    if (followId && markersRef.current.has(followId)) {
      const d = markersRef.current.get(followId);
      if (d) {
        try {
          map.easeTo({ center: [d.current.lng, d.current.lat], duration: 700 });
        } catch (e) {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, isReady, followId]);

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
    if (pollIntervalRef.current) return;

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
      const list = Object.values(participants).map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }));
      if (list.length === 0) return;

      const res = await fetch("/api/matrix-eta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: list }),
      });

      if (!res.ok) {
        try { await res.text(); } catch (_) {}
        return;
      }

      const json = await res.json();
      if (!json) return;

      let normalized: Record<string, { etaSeconds: number | null; distanceMeters: number | null }> = {};

      if (json.etas && typeof json.etas === "object" && !Array.isArray(json.etas)) {
        Object.entries(json.etas).forEach(([id, val]) => {
          if (!val) return;
          normalized[id] = {
            etaSeconds: typeof (val as any).etaSeconds === "number" ? (val as any).etaSeconds : (val as any).durationSeconds ?? null,
            distanceMeters: typeof (val as any).distanceMeters === "number" ? (val as any).distanceMeters : (val as any).distance ?? null,
          } as any;
        });
      } else if (Array.isArray(json.results)) {
        json.results.forEach((it: any) => {
          if (!it || !it.id) return;
          normalized[it.id] = {
            etaSeconds: it.etaSeconds ?? it.durationSeconds ?? it.duration ?? null,
            distanceMeters: it.distanceMeters ?? it.distance ?? null,
          };
        });
      } else if (Array.isArray(json)) {
        json.forEach((it: any) => {
          if (!it || !it.id) return;
          normalized[it.id] = {
            etaSeconds: it.etaSeconds ?? it.durationSeconds ?? it.duration ?? null,
            distanceMeters: it.distanceMeters ?? it.distance ?? null,
          };
        });
      } else if (typeof json === "object") {
        const maybeIds = Object.keys(json);
        const looksLikeMap = maybeIds.length > 0 && typeof json[maybeIds[0]] === "object" && (json[maybeIds[0]].etaSeconds || json[maybeIds[0]].distanceMeters || json[maybeIds[0]].duration);
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

      Object.entries(normalized).forEach(([id, val]) => {
        try {
          if (val && (typeof val.etaSeconds === "number" || typeof val.distanceMeters === "number")) {
            onParticipantETA && onParticipantETA(id, { etaSeconds: val.etaSeconds ?? null, distanceMeters: val.distanceMeters ?? null });
          }

          const data = markersRef.current.get(id);
          if (data && data.popupEl) {
            const baseName = (participants[id] && participants[id].name) || data.popupEl.innerText.split("|", 1)[0].trim();
            const etaText = (typeof val.etaSeconds === "number") ? formatETA(val.etaSeconds) : "--";
            data.popupEl.innerText = `${baseName} | ETA: ${etaText}`;
          }
        } catch (e) {}
      });

    } catch (e) {
      // swallow
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
    <div className={className} style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {!isReady && (
        <div style={{ position: "absolute", left: 8, top: 8, background: "rgba(255,255,255,0.9)", padding: "6px 8px", borderRadius: 6, fontSize: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
          Loading map...
        </div>
      )}
    </div>
  );
}

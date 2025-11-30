"use client";
import { useEffect, useRef, useState } from "react";

export default function useTomTomLoader() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loadingRef.current) return;
    loadingRef.current = true;

    const key = process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!key) {
      setError("NEXT_PUBLIC_TOMTOM_KEY not set in environment");
      return;
    }

    // CDN URLs (version pinned to 6.x example)
    const scriptSrc = "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js";
    const cssHref = "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css";

    // ensure CSS
    const existingLink = document.querySelector(`link[href="${cssHref}"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssHref;
      document.head.appendChild(link);
    }

    // ensure script
    if ((window as any).tt) {
      setLoaded(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
    if (existingScript) {
        // if script exists, wait for it to load
        const checkLoaded = () => {
            if ((window as any).tt) {
                setLoaded(true);
            } else {
                setTimeout(checkLoaded, 100);
            }
        };
        checkLoaded();
        return;
    }


    const s = document.createElement("script");
    s.src = scriptSrc;
    s.async = true;
    s.onload = () => {
      setLoaded(true);
    };
    s.onerror = (e) => {
      setError("Failed to load TomTom SDK script");
      console.error("TomTom script error", e);
    };
    document.body.appendChild(s);

    return () => {
      // keep CSS and script for dev persistence; do not aggressively remove
    };
  }, []);

  return { loaded, error };
}

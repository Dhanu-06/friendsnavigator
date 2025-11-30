// src/components/DestinationSearch.client.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";

type Suggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

type Props = {
  placeholder?: string;
  onSelect: (item: { label: string; lng: number; lat: number }) => void;
};

export default function DestinationSearch({ placeholder = "Search destination...", onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data?.ok) {
          setSuggestions(data.results || []);
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      } catch (e) {
        console.error("Search error", e);
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debRef.current) window.clearTimeout(debRef.current);
    };
  }, [query]);

  // keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        activeIndexRef.current = Math.min(activeIndexRef.current + 1, suggestions.length - 1);
        e.preventDefault();
        setQuery((q) => q); // trigger re-render
      } else if (e.key === "ArrowUp") {
        activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
        e.preventDefault();
        setQuery((q) => q);
      } else if (e.key === "Enter") {
        const idx = activeIndexRef.current >= 0 ? activeIndexRef.current : 0;
        const sel = suggestions[idx];
        if (sel) {
          handleSelect(sel);
          e.preventDefault();
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, suggestions]);

  function handleSelect(item: Suggestion) {
    setQuery(item.label);
    setOpen(false);
    setSuggestions([]);
    activeIndexRef.current = -1;
    onSelect({ label: item.label, lng: item.lon, lat: item.lat });
  }

  return (
    <div style={{ position: "relative", maxWidth: 520 }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Destination search"
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)"
        }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
      />
      {loading && <div style={{ position: "absolute", right: 10, top: 10 }}>…</div>}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "calc(100% + 8px)",
          background: "white",
          border: "1px solid #eee",
          borderRadius: 8,
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          zIndex: 40,
          maxHeight: 280,
          overflow: "auto"
        }}>
          {suggestions.map((s, i) => {
            const active = i === activeIndexRef.current;
            return (
              <div
                key={s.id}
                onMouseDown={(ev) => { ev.preventDefault(); handleSelect(s); }}
                onMouseEnter={() => { activeIndexRef.current = i; setQuery((q) => q); }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: active ? "#f3f6ff" : "white",
                  borderBottom: "1px solid #fafafa"
                }}
              >
                <div style={{ fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{s.lat?.toFixed(5)}, {s.lon?.toFixed(5)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

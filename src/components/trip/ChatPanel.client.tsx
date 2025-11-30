
// src/components/trip/ChatPanel.client.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import { fetchJson } from "@/lib/fetchJson";

export default function ChatPanel({ tripId, currentUserId = "dev-user" }: { tripId: string; currentUserId?: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages() {
    try {
      const res = await fetchJson(`/api/trips/${encodeURIComponent(tripId)}/messages`);
      if (res.data) {
        setMessages(res.data);
      }
      // scroll to bottom
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    } catch (e) {
      console.warn("loadMessages error", e);
    }
  }

  useEffect(() => {
    loadMessages();
    // poll every 3s for new messages when mounted
    pollRef.current = window.setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [tripId]);

  async function sendMessage() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const payload = { authorId: currentUserId, text: text.trim() };
      const res = await fetchJson(`/api/trips/${encodeURIComponent(tripId)}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        setText("");
        // append quickly (optimistic) then reload
        setMessages(prev => [...prev, { id: res.id ?? "temp-" + Date.now(), ...payload, ts: Date.now() }]);
        setTimeout(loadMessages, 300);
      } else {
        alert("Message not sent: " + (res.data.error ?? "unknown"));
      }
    } catch (e: any) {
      console.warn("sendMessage error", e);
      alert("Message failed: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Chat</div>
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", border: "1px solid #f3f3f3", padding: 8, borderRadius: 8, background: "white" }}>
        {messages.length === 0 && <div style={{ color: "#666" }}>No messages yet.</div>}
        {messages.map(m => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{m.authorId}</div>
            <div style={{ fontSize: 14 }}>{m.text}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{new Date(m.ts).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <button onClick={sendMessage} disabled={loading || !text.trim()} style={{ padding: "8px 12px", borderRadius: 8, background: "#2b8cff", color: "white", border: "none" }}>{loading ? "Sending..." : "Send"}</button>
      </div>
    </div>
  );
}

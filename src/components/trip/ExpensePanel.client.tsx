
// src/components/trip/ExpensePanel.client.tsx
"use client";
import React, { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

export default function ExpensePanel({ tripId, currentUserId = "dev-user" }: { tripId: string; currentUserId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function loadExpenses() {
    try {
      const res = await fetchJson(`/api/trips/${encodeURIComponent(tripId)}/expenses`);
      if (res.data) {
        setItems(res.data);
      }
    } catch (e) {
      console.warn("loadExpenses error", e);
    }
  }

  useEffect(() => {
    loadExpenses();
    const iv = window.setInterval(loadExpenses, 5000);
    return () => window.clearInterval(iv);
  }, [tripId]);

  async function addExpense() {
    if (!amount) return alert("Enter amount");
    const parsed = Number(amount);
    if (Number.isNaN(parsed) || parsed <= 0) return alert("Enter valid amount");
    setLoading(true);
    try {
      const payload = { authorId: currentUserId, amount: parsed, note };
      const res = await fetchJson(`/api/trips/${encodeURIComponent(tripId)}/expenses`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        setAmount("");
        setNote("");
        setItems(prev => [...prev, { id: res.id ?? "temp-" + Date.now(), ...payload, ts: Date.now() }]);
        setTimeout(loadExpenses, 300);
      } else {
        alert("Expense saving failed: " + (res.data.error ?? "unknown"));
      }
    } catch (e: any) {
      console.warn("addExpense error", e);
      alert("Error: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Expenses</div>
        <div style={{ fontSize: 13, color: "#666" }}>Total: ₹{total.toFixed(2)}</div>
      </div>

      <div style={{ marginTop: 8, flex: 1, overflowY: "auto", border: "1px solid #f3f3f3", padding: 8, borderRadius: 8, background: "white" }}>
        {items.length === 0 && <div style={{ color: "#666" }}>No expenses yet.</div>}
        {items.map(it => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #fbfbfb" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{it.authorId}</div>
              <div style={{ fontSize: 13 }}>{it.note}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{new Date(it.ts).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: 700 }}>₹{Number(it.amount).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" style={{ width: 120, padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <button onClick={addExpense} disabled={loading} style={{ padding: "8px 12px", borderRadius: 8, background: "#2b8cff", color: "white", border: "none" }}>{loading ? "Adding..." : "Add"}</button>
      </div>
    </div>
  );
}

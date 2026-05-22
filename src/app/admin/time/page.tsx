"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TimeLog = { id: string; date: string; quarter: string; category: string; hours: number; staffMember: string; notes: string | null };

const inp: React.CSSProperties = {
  background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)",
  borderRadius: "6px", padding: "0.4rem 0.6rem", color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)", fontSize: "0.8rem", outline: "none",
};

const CATEGORIES = ["", "EJ Meetup", "99 Problems", "Data/Reporting", "Admin", "TREK Meeting", "Other"];

export default function TimePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQ, setFilterQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", quarter: "", category: "EJ Meetup", hours: "2", staffMember: "Jerry", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterQ) params.set("quarter", filterQ);
    if (filterCat) params.set("category", filterCat);
    fetch(`/api/admin/time?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d); setLoading(false); });
  }, [filterQ, filterCat]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as { role?: string }).role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [session, status, router, load]);

  async function addLog() {
    if (!form.date || !form.hours) return;
    setSaving(true);
    const res = await fetch("/api/admin/time", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setLogs(prev => [created, ...prev]);
      setForm({ date: "", quarter: "", category: "EJ Meetup", hours: "2", staffMember: "Jerry", notes: "" });
      setAdding(false);
    }
    setSaving(false);
  }

  async function deleteLog(id: string) {
    await fetch(`/api/admin/time/${id}`, { method: "DELETE" });
    setLogs(prev => prev.filter(l => l.id !== id));
  }


  if (status === "loading") return null;

  const totalHours = logs.reduce((s, l) => s + l.hours, 0);
  const byCategory = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + l.hours;
    return acc;
  }, {});
  const quarters = [...new Set(logs.map(l => l.quarter).filter(Boolean))].sort();
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "860px" }}>

      <div>
        <span className="eyebrow">Administration</span>
        <h1>Program Time Log</h1>
        <p style={{ marginTop: "0.25rem", color: "var(--color-text-muted)" }}>Group sessions, events, and admin hours not tied to a specific entrepreneur.</p>
      </div>
      <Link href="/admin" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", alignSelf: "flex-start" }}>← Back to admin</Link>

      {/* Summary */}
      {logs.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div className="card" style={{ padding: "0.9rem 1.25rem", minWidth: "110px" }}>
            <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-dome-gold)", lineHeight: 1 }}>{totalHours.toLocaleString()}</p>
            <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>Total hours</p>
          </div>
          {Object.entries(byCategory).sort(([,a],[,b]) => b - a).map(([cat, h]) => (
            <div key={cat} className="card" style={{ padding: "0.9rem 1.25rem", minWidth: "100px" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-limestone)", lineHeight: 1 }}>{h}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>{cat}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterQ} onChange={e => setFilterQ(e.target.value)} style={{ ...inp, width: "130px" }}>
          <option value="">All quarters</option>
          {quarters.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inp, width: "160px" }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c || "All categories"}</option>)}
        </select>
        <button className="btn btn--primary" style={{ marginLeft: "auto", fontSize: "0.8rem" }} onClick={() => setAdding(v => !v)}>
          {adding ? "Cancel" : "+ Log entry"}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>New program entry</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.6rem" }}>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Date *</label><input style={{ ...inp, width: "100%" }} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Hours *</label><input style={{ ...inp, width: "100%" }} type="number" step="0.25" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} /></div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Category</label>
              <select style={{ ...inp, width: "100%" }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Staff</label><input style={{ ...inp, width: "100%" }} value={form.staffMember} onChange={e => setForm(f => ({ ...f, staffMember: e.target.value }))} /></div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Quarter</label><input style={{ ...inp, width: "100%" }} value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))} placeholder="Q2 2025" /></div>
          </div>
          <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Notes</label><textarea style={{ ...inp, width: "100%", minHeight: "52px", resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={addLog} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Log table */}
      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      ) : logs.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>No entries found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-strong)" }}>
                {["Date", "Quarter", "Category", "Hours", "Staff", "Notes", ""].map(h => (
                  <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>{fmtDate(l.date)}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-muted)" }}>{l.quarter}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{l.category}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "var(--color-dome-gold)" }}>{l.hours}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-muted)" }}>{l.staffMember}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-muted)", fontStyle: "italic", maxWidth: "220px" }}>{l.notes ?? ""}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}><button onClick={() => deleteLog(l.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#e07070" }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

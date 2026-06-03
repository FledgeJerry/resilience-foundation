"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Cohort = { id: string; name: string; program: string | null; year: number | null; description: string | null; _count: { businesses: number } };

const inp: React.CSSProperties = {
  width: "100%", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)",
  borderRadius: "6px", padding: "0.55rem 0.75rem", color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)", fontSize: "0.875rem", outline: "none",
};

export default function CohortsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", program: "", year: "", description: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/admin/cohorts").then(r => r.json()).then(setCohorts);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/cohorts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const c = await res.json();
      setCohorts(prev => [c, ...prev]);
      setForm({ name: "", program: "", year: "", description: "" });
      setAdding(false);
    }
    setSaving(false);
  }

  if (status === "loading") return null;
  if (session?.user.role !== "ADMIN") return null;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "720px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Cohort Management</h1>
        {!adding && (
          <button className="btn btn--primary" style={{ fontSize: "0.85rem" }} onClick={() => setAdding(true)}>+ New cohort</button>
        )}
      </div>

      {adding && (
        <form onSubmit={create} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>New Cohort</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem" }}>Name *</label>
              <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="TREK 2027" required />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem" }}>Program</label>
              <input style={inp} value={form.program} onChange={e => set("program", e.target.value)} placeholder="TREK" />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem" }}>Year</label>
              <input style={inp} type="number" value={form.year} onChange={e => set("year", e.target.value)} placeholder="2027" />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem" }}>Description</label>
              <input style={inp} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn btn--primary" style={{ fontSize: "0.85rem" }} disabled={saving}>{saving ? "Creating…" : "Create cohort"}</button>
            <button type="button" className="btn btn--ghost" style={{ fontSize: "0.85rem" }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {cohorts.map(c => (
          <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontWeight: 700, color: "var(--color-limestone)", fontSize: "1rem" }}>{c.name}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>
                {[c.program, c.year].filter(Boolean).join(" · ")}
                {c.description && ` — ${c.description}`}
              </p>
            </div>
            <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-teal-accent)", minWidth: "3rem", textAlign: "right" }}>{c._count.businesses}</span>
          </div>
        ))}
        {cohorts.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No cohorts yet.</p>}
      </div>
    </div>
  );
}

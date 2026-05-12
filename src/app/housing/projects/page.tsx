"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  status: string;
  address: string | null;
  purchasePrice: number | null;
  renovationCost: number | null;
  postRenoValue: number | null;
  totalShares: number;
  treasuryReservePct: number;
  updatedAt: string;
  shareholders: { id: string; shareCount: number; amountPaid: number }[];
  _count: { treasuryEntries: number };
};

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning", RAISING: "Raising", PURCHASED: "Purchased",
  RENOVATING: "Renovating", RENTING: "Renting", SOLD: "Sold",
};
const STATUS_CLASS: Record<string, string> = {
  PLANNING: "badge--muted", RAISING: "badge--gold", PURCHASED: "badge--blue",
  RENOVATING: "badge--teal", RENTING: "badge--teal", SOLD: "badge--muted",
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/housing/projects")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setProjects)
      .catch(err => { if (err === 401) router.push("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/housing/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const p = await res.json();
      router.push(`/housing/project/${p.id}`);
    }
    setCreating(false);
  }

  function issuePrice(p: Project) {
    const publicShares = p.totalShares - Math.round(p.totalShares * p.treasuryReservePct / 100);
    const total = (p.purchasePrice ?? 0) + (p.renovationCost ?? 0);
    return publicShares > 0 && total > 0 ? total / publicShares : null;
  }

  function totalSharesSold(p: Project) {
    return p.shareholders.filter(s => s.shareCount > 0).reduce((sum, s) => sum + s.shareCount, 0);
  }

  function totalRaised(p: Project) {
    return p.shareholders.reduce((sum, s) => sum + s.amountPaid, 0);
  }

  if (loading) return <div style={{ padding: "3rem", color: "var(--color-text-muted)" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="eyebrow">Housing Roadmap</span>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>My Housing Projects</h1>
          <p style={{ marginTop: "0.5rem" }}>Each project is a Sunshine House workbook — property, shares, shareholders, treasury, and documents.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowForm(v => !v)}>
          + New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProject} style={{ display: "flex", gap: "0.75rem", maxWidth: "480px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Project name — e.g. 123 Maple Street"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: "220px", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "6px", padding: "0.65rem 0.9rem", color: "var(--color-limestone)", fontFamily: "var(--font-sans)", fontSize: "1rem", outline: "none" }}
            autoFocus
          />
          <button type="submit" className="btn btn--primary" disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "Create"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p style={{ marginBottom: "1.5rem" }}>No projects yet. Start by naming your first Sunshine House project.</p>
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>+ New Project</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {projects.map(p => {
            const ip = issuePrice(p);
            const sold = totalSharesSold(p);
            const raised = totalRaised(p);
            const publicShares = p.totalShares - Math.round(p.totalShares * p.treasuryReservePct / 100);
            const pct = publicShares > 0 ? Math.min(100, (sold / publicShares) * 100) : 0;
            return (
              <Link key={p.id} href={`/housing/project/${p.id}`} style={{ textDecoration: "none" }}>
                <div className="card--raised" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", cursor: "pointer", transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <p style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--color-limestone)", fontSize: "1rem" }}>{p.name}</p>
                    <span className={`badge ${STATUS_CLASS[p.status] ?? "badge--muted"}`}>{STATUS_LABELS[p.status] ?? p.status}</span>
                  </div>
                  {p.address && <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{p.address}</p>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {ip && <div style={{ fontSize: "0.78rem" }}><span style={{ color: "var(--color-text-muted)" }}>Issue price </span><strong style={{ color: "var(--color-dome-gold)" }}>${ip.toFixed(2)}</strong></div>}
                    <div style={{ fontSize: "0.78rem" }}><span style={{ color: "var(--color-text-muted)" }}>Raised </span><strong style={{ color: "var(--color-limestone)" }}>${raised.toLocaleString()}</strong></div>
                    <div style={{ fontSize: "0.78rem" }}><span style={{ color: "var(--color-text-muted)" }}>Shares sold </span><strong style={{ color: "var(--color-limestone)" }}>{sold} / {publicShares}</strong></div>
                    <div style={{ fontSize: "0.78rem" }}><span style={{ color: "var(--color-text-muted)" }}>Ledger entries </span><strong style={{ color: "var(--color-limestone)" }}>{p._count.treasuryEntries}</strong></div>
                  </div>
                  {/* Raise progress bar */}
                  {publicShares > 0 && (
                    <div>
                      <div style={{ height: "6px", background: "var(--color-border-strong)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-dome-gold)", borderRadius: "3px", transition: "width 0.3s" }} />
                      </div>
                      <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>{pct.toFixed(0)}% of public shares sold</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href="/housing" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>&larr; Back to Housing Roadmap</Link>
      </div>
    </div>
  );
}

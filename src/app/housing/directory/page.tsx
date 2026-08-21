"use client";

import { useEffect, useState } from "react";

type HousingProject = {
  id: string; name: string; status: string;
  city: string | null; state: string | null; address: string | null;
  purchasePrice: number | null; totalShares: number; createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning", RAISING: "Raising", PURCHASED: "Purchased",
  RENOVATING: "Renovating", RENTING: "Renting", SOLD: "Sold",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "var(--color-text-muted)",
  RAISING: "var(--color-dome-gold)",
  PURCHASED: "var(--color-river-blue)",
  RENOVATING: "var(--color-teal, #0d9488)",
  RENTING: "var(--color-teal, #0d9488)",
  SOLD: "var(--color-text-muted)",
};

const STATUSES = Object.keys(STATUS_LABELS);

export default function HousingDirectoryPage() {
  const [projects, setProjects] = useState<HousingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/public/directory")
      .then(r => r.json())
      .then(d => { setProjects(d.housing); setLoading(false); });
  }, []);

  const q = query.toLowerCase().trim();
  const filtered = projects.filter(h => {
    if (statusFilter && h.status !== statusFilter) return false;
    if (q) return [h.name, h.city, h.address].some(v => v?.toLowerCase().includes(q));
    return true;
  });

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <span className="eyebrow">Community Directory</span>
      <h1 style={{ marginBottom: "0.5rem" }}>Housing Projects</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
        Fledge Fractals — renter-centric community housing where your rent builds real equity.
      </p>

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or city…"
          style={{ fontSize: "0.9rem" }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize: "0.85rem" }}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}

      {!loading && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          {(statusFilter || q) ? " matching your filters" : " total"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {filtered.map(h => (
          <div key={h.id} className="card" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem 1rem", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-limestone)" }}>{h.name}</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: STATUS_COLORS[h.status] ?? "var(--color-text-muted)" }}>
                  {STATUS_LABELS[h.status] ?? h.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--color-text-muted)", flexWrap: "wrap" }}>
                {h.address && <span>{h.address}</span>}
                {h.city && <span>{[h.city, h.state].filter(Boolean).join(", ")}</span>}
                {h.purchasePrice && <span>Target: ${h.purchasePrice.toLocaleString()}</span>}
                <span>{h.totalShares.toLocaleString()} shares</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
            No housing projects match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type CoopEntry = {
  id: string; name: string; tagline: string | null; location: string | null;
  sector: string | null; city: string | null; state: string | null;
  website: string | null; contactEmail: string | null; phone: string | null;
  source: "coop" | "business";
};

export default function DirectoryPage() {
  const [entries, setEntries] = useState<CoopEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  useEffect(() => {
    fetch("/api/public/directory")
      .then(r => r.json())
      .then(d => {
        const coops: CoopEntry[] = d.coops.map((c: CoopEntry) => ({ ...c, source: "coop" as const }));
        const bizCoops: CoopEntry[] = d.businesses
          .filter((b: { type: string; name: string; id: string; industry: string | null; city: string | null; state: string | null; website: string | null }) => b.type === "COOP")
          .map((b: { id: string; name: string; industry: string | null; city: string | null; state: string | null; website: string | null }) => ({
            id: b.id, name: b.name, tagline: null, location: null,
            sector: b.industry, city: b.city, state: b.state,
            website: b.website, contactEmail: null, phone: null,
            source: "business" as const,
          }));
        const seen = new Set<string>();
        const merged = [...coops, ...bizCoops].filter(e => {
          if (seen.has(e.name.toLowerCase())) return false;
          seen.add(e.name.toLowerCase());
          return true;
        });
        merged.sort((a, b) => a.name.localeCompare(b.name));
        setEntries(merged);
        setLoading(false);
      });
  }, []);

  const sectors = [...new Set(entries.map(e => e.sector).filter(Boolean))].sort() as string[];

  const q = query.toLowerCase().trim();
  const filtered = entries.filter(e => {
    if (sectorFilter && e.sector !== sectorFilter) return false;
    if (q) return [e.name, e.tagline, e.location, e.sector, e.city].some(v => v?.toLowerCase().includes(q));
    return true;
  });

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <span className="eyebrow">Cooperative Directory</span>
      <h1 style={{ marginBottom: "0.5rem" }}>Worker-owned co-ops</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
        Worker-owned and community-owned cooperatives building a better economy together.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, sector, or location…"
          style={{ fontSize: "0.9rem" }}
        />
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} style={{ fontSize: "0.85rem" }}>
          <option value="">All sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}

      {!loading && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          {filtered.length} co-op{filtered.length !== 1 ? "s" : ""}
          {(sectorFilter || q) ? " matching your filters" : " total"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtered.map(e => (
          <div key={e.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-limestone)", margin: "0 0 0.2rem" }}>{e.name}</p>
                {e.tagline && <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", margin: "0 0 0.4rem", lineHeight: 1.5 }}>{e.tagline}</p>}
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--color-text-muted)", flexWrap: "wrap" }}>
                  {e.sector && <span>{e.sector}</span>}
                  {(e.location || e.city) && <span>{e.location ?? [e.city, e.state].filter(Boolean).join(", ")}</span>}
                  {e.contactEmail && <a href={`mailto:${e.contactEmail}`} style={{ color: "var(--color-river-blue)" }}>{e.contactEmail}</a>}
                  {e.phone && <span>{e.phone}</span>}
                </div>
              </div>
              {e.website && (
                <a href={e.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--color-river-blue)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  Website →
                </a>
              )}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
            No co-ops match your search.
          </div>
        )}
      </div>
    </div>
  );
}

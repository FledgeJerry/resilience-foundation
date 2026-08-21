"use client";

import { useEffect, useState } from "react";

type Business = {
  id: string; name: string; type: string; stage: string;
  industry: string | null; city: string | null; state: string | null;
  website: string | null; description: string | null; createdAt: string;
};

const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea", KNOW_GROUND: "Know the Ground", FIND_PEOPLE: "Find People",
  BUILD_STRUCTURE: "Build Structure", TEST_SMALL: "Test Small",
  GET_SUPPORT: "Get Support", SUSTAIN: "Sustain", GROW: "Grow",
};

const STAGES = Object.keys(STAGE_LABELS);

export default function EntrepreneursPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  useEffect(() => {
    fetch("/api/public/directory")
      .then(r => r.json())
      .then(d => {
        setBusinesses((d.businesses as Business[]).filter(b => b.type !== "COOP"));
        setLoading(false);
      });
  }, []);

  const industries = [...new Set(businesses.map(b => b.industry).filter(Boolean))].sort() as string[];

  const q = query.toLowerCase().trim();
  const filtered = businesses.filter(b => {
    if (stageFilter && b.stage !== stageFilter) return false;
    if (industryFilter && b.industry !== industryFilter) return false;
    if (q) return [b.name, b.industry, b.city, b.description].some(v => v?.toLowerCase().includes(q));
    return true;
  });

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <span className="eyebrow">Community Directory</span>
      <h1 style={{ marginBottom: "0.5rem" }}>Entrepreneurs</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
        Ventures at every stage — from early ideas to growing businesses.
      </p>

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, industry, or city…"
          style={{ fontSize: "0.9rem" }}
        />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ fontSize: "0.85rem" }}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} style={{ fontSize: "0.85rem" }}>
          <option value="">All industries</option>
          {industries.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}

      {!loading && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          {filtered.length} entrepreneur{filtered.length !== 1 ? "s" : ""}
          {(stageFilter || industryFilter || q) ? " matching your filters" : " total"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {filtered.map(b => (
          <div key={b.id} className="card" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem 1rem", alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-limestone)" }}>{b.name}</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-dome-gold)", background: "rgba(200,165,80,0.12)", padding: "2px 7px", borderRadius: "999px" }}>
                  {STAGE_LABELS[b.stage] ?? b.stage}
                </span>
              </div>
              {b.description && (
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: "0 0 0.25rem", lineHeight: 1.5 }}>{b.description}</p>
              )}
              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--color-text-muted)", flexWrap: "wrap" }}>
                {b.industry && <span>{b.industry}</span>}
                {b.city && <span>{[b.city, b.state].filter(Boolean).join(", ")}</span>}
              </div>
            </div>
            {b.website && (
              <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--color-river-blue)", whiteSpace: "nowrap" }}>
                Website →
              </a>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
            No entrepreneurs match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type CoopListing = {
  id: string;
  name: string;
  tagline: string | null;
  location: string | null;
  sector: string | null;
  foundedAt: string | null;
  website: string | null;
  contactEmail: string | null;
  phone: string | null;
};

export default function DirectoryPage() {
  const [listings, setListings] = useState<CoopListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/directory")
      .then((r) => r.json())
      .then((data) => { setListings(data); setLoading(false); });
  }, []);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? listings.filter((c) =>
        [c.name, c.tagline, c.location, c.sector].some((v) => v?.toLowerCase().includes(q))
      )
    : listings;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <span className="eyebrow">Cooperative Directory</span>
      <h1 style={{ marginBottom: "0.5rem" }}>Co-ops in our ecosystem</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
        Worker-owned and community-owned cooperatives building a better economy together.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, sector, or location…"
        style={{ width: "100%", marginBottom: "2rem", fontSize: "1rem" }}
      />

      {loading && <p className="text-muted">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "3rem 0" }}>
          {q ? "No co-ops match your search." : "No co-ops are listed yet."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filtered.map((c) => (
          <div key={c.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: "1.15rem", margin: "0 0 0.25rem" }}>{c.name}</h2>
                {c.tagline && (
                  <p style={{ color: "var(--color-text-secondary)", margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
                    {c.tagline}
                  </p>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {c.sector && (
                    <span className="badge badge--blue">{c.sector}</span>
                  )}
                  {c.location && (
                    <span className="badge badge--teal">{c.location}</span>
                  )}
                  {c.foundedAt && (
                    <span className="badge" style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
                      Est. {c.foundedAt}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(c.website || c.contactEmail || c.phone) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)", fontSize: "0.85rem" }}>
                {c.website && (
                  <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--color-primary)" }}>
                    🌐 {c.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {c.contactEmail && (
                  <a href={`mailto:${c.contactEmail}`} style={{ color: "var(--color-primary)" }}>
                    ✉ {c.contactEmail}
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} style={{ color: "var(--color-primary)" }}>
                    📞 {c.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

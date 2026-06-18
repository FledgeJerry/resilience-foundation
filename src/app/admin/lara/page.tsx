"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Business = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  formationType: string | null;
  laraId: string | null;
  formationDate: string | null;
  stage: string;
  members: { user: { name: string | null; email: string } }[];
};

type LaraResult = {
  name: string;
  laraId: string;
  type: string;
  status: string;
  formationDate: string | null;
};

const LARA_SEARCH_URL = (name: string) =>
  `https://cofs.lara.state.mi.us/CorpWeb/CorpSearch/CorpSearch.aspx?Action=FREEFORMSEARCH&ENTITY_NAME=${encodeURIComponent(name)}&CAN=&TYPE=ALL&SEARCH_TYPE=BEGINS_WITH&LOCATION=ALL`;

export default function LaraPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Per-row state
  const [lookupId, setLookupId] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<LaraResult[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLaraId, setEditLaraId] = useState("");
  const [editLaraDate, setEditLaraDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/lara")
      .then((r) => r.json())
      .then(({ businesses }) => { setBusinesses(businesses); setLoading(false); });
  }, [session, status, router]);

  async function runLookup(b: Business) {
    setLookupId(b.id);
    setLookupResults([]);
    setLookupError(null);
    const r = await fetch(`/api/admin/lara?search=${encodeURIComponent(b.name)}`);
    const data = await r.json();
    setLookupResults(data.results ?? []);
    setLookupError(data.error ?? null);
  }

  function startEdit(b: Business, prefill?: LaraResult) {
    setEditId(b.id);
    setEditLaraId(prefill?.laraId ?? b.laraId ?? "");
    setEditLaraDate(prefill?.formationDate ?? (b.formationDate ? b.formationDate.slice(0, 10) : ""));
  }

  async function save(businessId: string) {
    setSaving(true);
    await fetch("/api/admin/lara", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: businessId, laraId: editLaraId, laraDate: editLaraDate }),
    });
    setSaving(false);
    setSaved(businessId);
    setEditId(null);
    setLookupId(null);
    setBusinesses((bs) => bs.filter((b) => b.id !== businessId));
    setTimeout(() => setSaved(null), 3000);
  }

  const filtered = businesses.filter((b) =>
    !search.trim() ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Administration</span>
          <h1>LARA Lookup</h1>
          <p style={{ marginTop: "0.25rem", color: "var(--color-text-muted)" }}>
            {businesses.length} businesses missing LARA date
          </p>
        </div>
        <a href="/admin" className="btn btn--ghost" style={{ fontSize: "0.85rem" }}>← Admin</a>
      </div>

      {saved && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "rgba(46,125,50,0.12)", color: "#1b5e20", border: "1px solid #4caf50", fontSize: "0.875rem" }}>
          ✓ Saved
        </div>
      )}

      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="search"
            placeholder="Filter by name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: "360px", padding: "0.4rem 0.75rem", borderRadius: "6px",
              border: "1px solid var(--color-border-strong)", background: "var(--color-surface)",
              color: "var(--color-limestone)", fontSize: "0.875rem" }}
          />
        </div>

        {filtered.length === 0 && (
          <p className="text-muted">{search ? "No matches." : "All businesses have a LARA date — nothing to do!"}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((b) => (
            <div key={b.id} style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.85rem 1rem", background: "var(--color-surface)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "var(--color-limestone)" }}>{b.name}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                    {[b.city, b.state].filter(Boolean).join(", ")}
                    {b.formationType && ` · ${b.formationType}`}
                    {b.members.length > 0 && ` · ${b.members.map((m) => m.user.name ?? m.user.email).join(", ")}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flexShrink: 0 }}>
                  <button
                    className="btn btn--secondary"
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                    onClick={() => runLookup(b)}
                    disabled={lookupId === b.id}
                  >
                    {lookupId === b.id && lookupResults.length === 0 && !lookupError ? "Searching…" : "🔍 Search LARA"}
                  </button>
                  <a
                    href={LARA_SEARCH_URL(b.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost"
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                  >
                    Open LARA ↗
                  </a>
                  <button
                    className="btn btn--ghost"
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                    onClick={() => startEdit(b)}
                  >
                    ✏️ Enter manually
                  </button>
                </div>
              </div>

              {/* Server-side lookup results */}
              {lookupId === b.id && (lookupResults.length > 0 || lookupError) && (
                <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
                  {lookupError && (
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                      ⚠️ Server lookup failed ({lookupError}) — use "Open LARA ↗" to search manually.
                    </p>
                  )}
                  {lookupResults.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
                        LARA results for "{b.name}"
                      </p>
                      {lookupResults.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
                          padding: "0.5rem 0.75rem", borderRadius: "6px", background: "var(--color-surface-raised)", flexWrap: "wrap" }}>
                          <div style={{ fontSize: "0.8rem" }}>
                            <strong>{r.name}</strong>
                            <span style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                              {r.laraId} · {r.type} · <span style={{ color: r.status === "ACTIVE" ? "#2e7d32" : "#c62828" }}>{r.status}</span>
                              {r.formationDate && ` · formed ${r.formationDate}`}
                            </span>
                          </div>
                          <button
                            className="btn btn--primary"
                            style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                            onClick={() => startEdit(b, r)}
                          >
                            Use this →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {lookupResults.length === 0 && !lookupError && (
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No results found — try "Open LARA ↗" to search with different spelling.</p>
                  )}
                </div>
              )}

              {/* Manual entry / confirm form */}
              {editId === b.id && (
                <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>LARA ID</label>
                    <input
                      value={editLaraId}
                      onChange={(e) => setEditLaraId(e.target.value)}
                      placeholder="B12345678"
                      style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-limestone)", fontSize: "0.875rem", width: "140px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>LARA Filing Date</label>
                    <input
                      type="date"
                      value={editLaraDate}
                      onChange={(e) => setEditLaraDate(e.target.value)}
                      style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-limestone)", fontSize: "0.875rem" }}
                    />
                  </div>
                  <button
                    className="btn btn--primary"
                    style={{ fontSize: "0.8rem" }}
                    onClick={() => save(b.id)}
                    disabled={saving || (!editLaraId && !editLaraDate)}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

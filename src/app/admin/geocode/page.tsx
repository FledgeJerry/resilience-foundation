"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Business = {
  id: string;
  name: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  laraId: string | null;
  geocodeTriedAt: string | null;
  members: { user: { name: string | null; email: string } }[];
};

const mapsSearchUrl = (b: Business) => {
  const addr = [b.street, b.city, b.state, b.zip].filter(Boolean).join(", ") || b.name;
  return `https://www.google.com/maps/search/${encodeURIComponent(addr)}`;
};

export default function GeocodePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editStreet, setEditStreet] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; geocoded: boolean } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [session, status, router]);

  function load() {
    fetch("/api/admin/geocode")
      .then((r) => r.json())
      .then(({ businesses }) => { setBusinesses(businesses); setLoading(false); });
  }

  function startEdit(b: Business) {
    setEditId(b.id);
    setEditStreet(b.street ?? "");
    setEditCity(b.city ?? "");
    setEditState(b.state ?? "");
    setEditZip(b.zip ?? "");
    setResult(null);
  }

  async function save(id: string) {
    setSaving(id);
    const r = await fetch("/api/admin/geocode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, street: editStreet, city: editCity, state: editState, zip: editZip }),
    });
    const data = await r.json();
    setSaving(null);
    setResult({ id, geocoded: !!data.geocoded });
    setEditId(null);
    if (data.geocoded) {
      setBusinesses((bs) => bs.filter((b) => b.id !== id));
    } else {
      load();
    }
  }

  async function retry(b: Business) {
    setSaving(b.id);
    const r = await fetch("/api/admin/geocode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id }),
    });
    const data = await r.json();
    setSaving(null);
    setResult({ id: b.id, geocoded: !!data.geocoded });
    if (data.geocoded) setBusinesses((bs) => bs.filter((x) => x.id !== b.id));
  }

  const filtered = businesses.filter((b) =>
    !search.trim() ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
    b.members.some((m) => (m.user.name ?? m.user.email).toLowerCase().includes(search.toLowerCase()))
  );

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Geocoding</h1>
          <p style={{ marginTop: "0.25rem", color: "var(--color-text-muted)" }}>
            {businesses.length} businesses missing a map pin
          </p>
        </div>
        <a href="/admin" className="btn btn--ghost" style={{ fontSize: "0.85rem" }}>← Admin</a>
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="search"
            placeholder="Filter by business, city, or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: "360px", padding: "0.4rem 0.75rem", borderRadius: "6px",
              border: "1px solid var(--color-border-strong)", background: "var(--color-surface)",
              color: "var(--color-limestone)", fontSize: "0.875rem" }}
          />
        </div>

        {filtered.length === 0 && (
          <p className="text-muted">{search ? "No matches." : "Every business has a map pin — nothing to do!"}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((b) => {
            const owner = b.members[0]?.user;
            const partialAddress = [b.street, b.city, b.state, b.zip].filter(Boolean).join(", ");
            return (
              <div key={b.id} style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.85rem 1rem", background: "var(--color-surface)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: "var(--color-limestone)" }}>{b.name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                      {owner && <>{owner.name ?? "—"} · {owner.email}</>}
                      {b.website && <> · <a href={b.website.startsWith("http") ? b.website : `https://${b.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>{b.website}</a></>}
                      {b.laraId && <> · LARA {b.laraId}</>}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                      {partialAddress || "no address on file"}
                      {b.geocodeTriedAt && <span style={{ marginLeft: "0.5rem", color: "#c62828" }}>· last attempt failed to match</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flexShrink: 0 }}>
                    <button
                      className="btn btn--secondary"
                      style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                      onClick={() => retry(b)}
                      disabled={saving === b.id}
                    >
                      {saving === b.id ? "Retrying…" : "↻ Retry"}
                    </button>
                    <a
                      href={mapsSearchUrl(b)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--ghost"
                      style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                    >
                      Open Maps ↗
                    </a>
                    <button
                      className="btn btn--ghost"
                      style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                      onClick={() => startEdit(b)}
                    >
                      ✏️ Fix address
                    </button>
                  </div>
                </div>

                {result?.id === b.id && !result.geocoded && (
                  <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#c62828" }}>
                    ⚠️ Still couldn't match that address — try "Open Maps ↗" to confirm it, then fix it here.
                  </p>
                )}

                {editId === b.id && (
                  <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div>
                      <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Street</label>
                      <input value={editStreet} onChange={(e) => setEditStreet(e.target.value)} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-limestone)", fontSize: "0.875rem", width: "200px" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>City</label>
                      <input value={editCity} onChange={(e) => setEditCity(e.target.value)} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-limestone)", fontSize: "0.875rem", width: "140px" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>State</label>
                      <input value={editState} onChange={(e) => setEditState(e.target.value)} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-limestone)", fontSize: "0.875rem", width: "70px" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Zip</label>
                      <input value={editZip} onChange={(e) => setEditZip(e.target.value)} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-limestone)", fontSize: "0.875rem", width: "90px" }} />
                    </div>
                    <button
                      className="btn btn--primary"
                      style={{ fontSize: "0.8rem" }}
                      onClick={() => save(b.id)}
                      disabled={saving === b.id}
                    >
                      {saving === b.id ? "Saving…" : "Save & geocode"}
                    </button>
                    <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setEditId(null)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

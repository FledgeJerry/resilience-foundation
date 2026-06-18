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
  phone: string | null;
  stage: string;
  industry: string | null;
  createdAt: string;
  cohort: { name: string } | null;
  _count: { members: number; contacts: number; deals: number; timeLogs: number };
  members: { user: { name: string | null; email: string } }[];
};

const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea", KNOW_GROUND: "Know Ground", FIND_PEOPLE: "Find People",
  BUILD_STRUCTURE: "Build Structure", TEST_SMALL: "Test Small",
  GET_SUPPORT: "Get Support", SUSTAIN: "Sustain", GROW: "Grow",
};

function BizCard({ b, selected, onSelect, keepLabel }: {
  b: Business; selected: boolean; onSelect: () => void; keepLabel?: string;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: `2px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
        borderRadius: "8px", padding: "0.85rem 1rem", cursor: "pointer",
        background: selected ? "rgba(92,61,158,0.06)" : "var(--color-surface)",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <strong style={{ color: "var(--color-limestone)" }}>{b.name}</strong>
        {keepLabel && (
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: "4px",
            background: keepLabel === "KEEP" ? "#2e7d32" : "#c62828", color: "#fff", whiteSpace: "nowrap" }}>
            {keepLabel}
          </span>
        )}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        {b.city && <span>📍 {[b.street, b.city, b.state].filter(Boolean).join(", ")}</span>}
        <span>Stage: {STAGE_LABELS[b.stage] ?? b.stage}</span>
        {b.industry && <span>Industry: {b.industry}</span>}
        {b.cohort && <span>Cohort: {b.cohort.name}</span>}
        <span>
          {b._count.members} member{b._count.members !== 1 ? "s" : ""} ·{" "}
          {b._count.contacts} contact{b._count.contacts !== 1 ? "s" : ""} ·{" "}
          {b._count.deals} deal{b._count.deals !== 1 ? "s" : ""} ·{" "}
          {b._count.timeLogs} time log{b._count.timeLogs !== 1 ? "s" : ""}
        </span>
        {b.members.length > 0 && (
          <span>👤 {b.members.map((m) => m.user.name ?? m.user.email).join(", ")}</span>
        )}
        <span style={{ color: "var(--color-border-strong)" }}>
          Created {new Date(b.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export default function MergePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<Business[][]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<[Business | null, Business | null]>([null, null]);
  const [keepSide, setKeepSide] = useState<0 | 1 | null>(null);
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/merge")
      .then((r) => r.json())
      .then(({ businesses, duplicateGroups }) => {
        setBusinesses(businesses);
        setDuplicateGroups(duplicateGroups);
        setLoading(false);
      });
  }, [session, status, router]);

  function pickBusiness(b: Business) {
    setResult(null);
    setKeepSide(null);
    if (selected[0]?.id === b.id || selected[1]?.id === b.id) {
      // deselect
      setSelected([selected[0]?.id === b.id ? null : selected[0], selected[1]?.id === b.id ? null : selected[1]]);
      return;
    }
    if (!selected[0]) { setSelected([b, selected[1]]); return; }
    if (!selected[1]) { setSelected([selected[0], b]); return; }
    // replace whichever was picked first
    setSelected([b, null]);
  }

  function quickPick(a: Business, b: Business) {
    setSelected([a, b]);
    setKeepSide(null);
    setResult(null);
  }

  async function executeMerge() {
    if (!selected[0] || !selected[1] || keepSide === null) return;
    const keepId = keepSide === 0 ? selected[0].id : selected[1].id;
    const deleteId = keepSide === 0 ? selected[1].id : selected[0].id;
    setMerging(true);
    const r = await fetch("/api/admin/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, deleteId }),
    });
    const data = await r.json();
    setMerging(false);
    if (data.ok) {
      const filled = data.fieldsFilled?.length ? ` Fields copied: ${data.fieldsFilled.join(", ")}.` : "";
      setResult(`✓ Merged successfully.${filled}`);
      setSelected([null, null]);
      setKeepSide(null);
      // Reload list
      fetch("/api/admin/merge")
        .then((r) => r.json())
        .then(({ businesses, duplicateGroups }) => { setBusinesses(businesses); setDuplicateGroups(duplicateGroups); });
    } else {
      setResult(`Error: ${data.error}`);
    }
  }

  const filtered = businesses.filter((b) =>
    !search.trim() ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
    b.members.some((m) => (m.user.name ?? m.user.email).toLowerCase().includes(search.toLowerCase()))
  );

  const bothSelected = selected[0] && selected[1];

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Merge Duplicate Businesses</h1>
          <p style={{ marginTop: "0.25rem", color: "var(--color-text-muted)" }}>
            {businesses.length} businesses · {duplicateGroups.length} potential duplicate group{duplicateGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a href="/admin" className="btn btn--ghost" style={{ fontSize: "0.85rem" }}>← Admin</a>
      </div>

      {result && (
        <div style={{
          padding: "0.75rem 1rem", borderRadius: "6px",
          background: result.startsWith("✓") ? "rgba(46,125,50,0.12)" : "rgba(198,40,40,0.12)",
          color: result.startsWith("✓") ? "#1b5e20" : "#b71c1c",
          border: `1px solid ${result.startsWith("✓") ? "#4caf50" : "#ef9a9a"}`,
          fontSize: "0.875rem",
        }}>
          {result}
        </div>
      )}

      {/* Compare panel */}
      {bothSelected && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Compare & Merge</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            {([0, 1] as const).map((i) => (
              <div key={i}>
                <BizCard
                  b={selected[i]!}
                  selected={keepSide === i}
                  onSelect={() => setKeepSide(i)}
                  keepLabel={keepSide === i ? "KEEP" : keepSide === (1 - i) ? "DELETE" : undefined}
                />
                <button
                  className={keepSide === i ? "btn btn--primary" : "btn btn--secondary"}
                  style={{ width: "100%", marginTop: "0.5rem", fontSize: "0.85rem" }}
                  onClick={() => setKeepSide(i)}
                >
                  {keepSide === i ? "✓ Keeping this one" : "Keep this one"}
                </button>
              </div>
            ))}
          </div>
          {keepSide !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", flex: 1 }}>
                Will keep <strong>{selected[keepSide]!.name}</strong>, move all records from{" "}
                <strong>{selected[1 - keepSide]!.name}</strong> to it, fill any empty fields, then delete the duplicate.
              </p>
              <button
                className="btn btn--primary"
                style={{ background: "#c62828", borderColor: "#c62828", whiteSpace: "nowrap" }}
                onClick={executeMerge}
                disabled={merging}
              >
                {merging ? "Merging…" : "Merge & Delete Duplicate"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Potential duplicates */}
      {duplicateGroups.length > 0 && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ marginBottom: "1rem", fontSize: "1rem" }}>
            ⚠️ Potential Duplicates ({duplicateGroups.length} group{duplicateGroups.length !== 1 ? "s" : ""})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {duplicateGroups.map((group, gi) => (
              <div key={gi} style={{ borderLeft: "3px solid var(--color-primary)", paddingLeft: "1rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                  "{group[0].name}" — {group.length} records
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem" }}>
                  {group.map((b) => (
                    <BizCard
                      key={b.id}
                      b={b}
                      selected={selected[0]?.id === b.id || selected[1]?.id === b.id}
                      onSelect={() => pickBusiness(b)}
                    />
                  ))}
                </div>
                {group.length === 2 && (
                  <button
                    className="btn btn--ghost"
                    style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}
                    onClick={() => quickPick(group[0], group[1])}
                  >
                    Compare these two →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All businesses */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>All Businesses</h2>
          <input
            type="search"
            placeholder="Search by name, city, or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "200px", padding: "0.4rem 0.75rem", borderRadius: "6px",
              border: "1px solid var(--color-border-strong)", background: "var(--color-surface)",
              color: "var(--color-limestone)", fontSize: "0.875rem" }}
          />
          {(selected[0] || selected[1]) && (
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }}
              onClick={() => { setSelected([null, null]); setKeepSide(null); }}>
              Clear selection
            </button>
          )}
        </div>
        {!bothSelected && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            Click two businesses to compare and merge them.
            {selected[0] && !selected[1] && ` "${selected[0].name}" selected — pick one more.`}
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.6rem" }}>
          {filtered.map((b) => (
            <BizCard
              key={b.id}
              b={b}
              selected={selected[0]?.id === b.id || selected[1]?.id === b.id}
              onSelect={() => pickBusiness(b)}
            />
          ))}
          {filtered.length === 0 && <p className="text-muted">No results.</p>}
        </div>
      </div>
    </div>
  );
}

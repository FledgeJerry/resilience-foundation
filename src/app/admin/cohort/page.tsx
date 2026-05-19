"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STAGES = ["IDEA", "KNOW_GROUND", "FIND_PEOPLE", "BUILD_STRUCTURE", "TEST_SMALL", "GET_SUPPORT", "SUSTAIN", "GROW"];
const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea", KNOW_GROUND: "Know Ground", FIND_PEOPLE: "Find People",
  BUILD_STRUCTURE: "Build Structure", TEST_SMALL: "Test Small",
  GET_SUPPORT: "Get Support", SUSTAIN: "Sustain", GROW: "Grow",
};

type Owner = { id: string; name: string | null; email: string; phone: string | null };
type Entry = {
  id: string;
  name: string;
  stage: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  county: string | null;
  website: string | null;
  formationType: string | null;
  currentFte: number | null;
  plannedFte: number | null;
  annualRevenue: number | null;
  isMinorityOwned: boolean;
  isWomanOwned: boolean;
  isVeteranOwned: boolean;
  leapStatus: string | null;
  leapSubmittedAt: string | null;
  notes: string | null;
  members: { user: Owner }[];
  _count: { contacts: number; deals: number; planEntries: number };
};

const inputStyle: React.CSSProperties = {
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)",
  fontSize: "0.875rem",
  outline: "none",
};

function OwnershipBadges({ entry }: { entry: Entry }) {
  const badges = [
    entry.isMinorityOwned && "Minority",
    entry.isWomanOwned && "Woman",
    entry.isVeteranOwned && "Veteran",
  ].filter(Boolean) as string[];
  if (!badges.length) return null;
  return (
    <span style={{ display: "inline-flex", gap: "0.25rem", flexWrap: "wrap" }}>
      {badges.map((b) => (
        <span key={b} style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", background: "rgba(74,155,142,0.15)", color: "var(--color-teal-accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{b}</span>
      ))}
    </span>
  );
}

function StageSelect({ id, value, onChange }: { id: string; value: string; onChange: (id: string, stage: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(id, e.target.value)}
      style={{ ...inputStyle, padding: "0.3rem 0.5rem", fontSize: "0.75rem", cursor: "pointer" }}
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>{STAGE_LABELS[s]}</option>
      ))}
    </select>
  );
}

export default function CohortPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const load = useCallback((query = q, stage = filterStage, industry = filterIndustry) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (stage) params.set("stage", stage);
    if (industry) params.set("industry", industry);
    return fetch(`/api/admin/cohort?${params}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); });
  }, [q, filterStage, filterIndustry]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [session, status, router, load]);

  async function updateStage(id: string, stage: string) {
    setSaving((s) => ({ ...s, [id]: true }));
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, stage } : e));
    await fetch("/api/admin/cohort", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    });
    setSaving((s) => ({ ...s, [id]: false }));
  }

  const industries = Array.from(new Set(entries.map((e) => e.industry).filter(Boolean))).sort() as string[];

  if (status === "loading" || loading) return <div style={{ padding: "3rem", color: "var(--color-text-muted)" }}>Loading cohort…</div>;

  const stageCount = STAGES.reduce((acc, s) => {
    acc[s] = entries.filter((e) => e.stage === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Entrepreneur Cohort</h1>
          <p style={{ marginTop: "0.25rem" }}>{entries.length} entrepreneurs imported from LEAP</p>
        </div>
        <Link href="/admin" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", alignSelf: "flex-end" }}>← Back to admin</Link>
      </div>

      {/* Stage pipeline summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "0.5rem" }}>
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => { const next = filterStage === s ? "" : s; setFilterStage(next); load(q, next, filterIndustry); }}
            style={{
              background: filterStage === s ? "var(--color-dome-gold)" : "var(--color-surface)",
              border: `1px solid ${filterStage === s ? "var(--color-dome-gold)" : "var(--color-border-strong)"}`,
              borderRadius: "8px",
              padding: "0.6rem 0.5rem",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: filterStage === s ? "var(--color-midnight-steel)" : "var(--color-limestone)", lineHeight: 1 }}>
              {stageCount[s] ?? 0}
            </p>
            <p style={{ fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: filterStage === s ? "var(--color-midnight-steel)" : "var(--color-text-muted)", marginTop: "0.25rem" }}>
              {STAGE_LABELS[s]}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search name, email, business…"
          value={q}
          onChange={(e) => { setQ(e.target.value); load(e.target.value, filterStage, filterIndustry); }}
          style={{ ...inputStyle, minWidth: "260px" }}
        />
        <select
          value={filterIndustry}
          onChange={(e) => { setFilterIndustry(e.target.value); load(q, filterStage, e.target.value); }}
          style={inputStyle}
        >
          <option value="">All industries</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        {(q || filterStage || filterIndustry) && (
          <button
            className="btn btn--ghost"
            style={{ fontSize: "0.8rem" }}
            onClick={() => { setQ(""); setFilterStage(""); setFilterIndustry(""); load("", "", ""); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", overflowX: "auto" }}>
        <table className="ll-table" style={{ minWidth: "900px" }}>
          <thead>
            <tr>
              <th>Entrepreneur / Business</th>
              <th>Contact</th>
              <th>Stage</th>
              <th>Industry</th>
              <th>Location</th>
              <th>Revenue</th>
              <th>FTEs</th>
              <th>LEAP Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>No entries found</td></tr>
            )}
            {entries.map((e) => {
              const owner = e.members[0]?.user;
              return (
                <tr key={e.id}>
                  <td>
                    <p style={{ fontWeight: 600, color: "var(--color-limestone)", fontSize: "0.9rem" }}>{e.name}</p>
                    {owner && <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{owner.name ?? ""}</p>}
                    <OwnershipBadges entry={e} />
                  </td>
                  <td>
                    {owner && (
                      <>
                        <p style={{ fontSize: "0.78rem" }}>{owner.email}</p>
                        {owner.phone && <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{owner.phone}</p>}
                      </>
                    )}
                  </td>
                  <td>
                    <StageSelect id={e.id} value={e.stage} onChange={updateStage} />
                    {saving[e.id] && <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", display: "block" }}>Saving…</span>}
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>{e.industry ?? "—"}</td>
                  <td style={{ fontSize: "0.78rem" }}>
                    {e.county ? <p>{e.county} Co.</p> : null}
                    {e.city || e.state ? <p style={{ color: "var(--color-text-muted)" }}>{[e.city, e.state].filter(Boolean).join(", ")}</p> : null}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {e.annualRevenue != null
                      ? `$${e.annualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {e.currentFte != null ? <span>{e.currentFte} now</span> : null}
                    {e.plannedFte != null ? <span style={{ color: "var(--color-text-muted)", display: "block" }}>{e.plannedFte} planned</span> : null}
                    {e.currentFte == null && e.plannedFte == null ? "—" : null}
                  </td>
                  <td>
                    {e.leapStatus && (
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: "3px",
                        background: e.leapStatus === "Connected" ? "rgba(46,109,164,0.15)" : e.leapStatus === "Not Approved" ? "rgba(192,57,43,0.15)" : "rgba(232,200,74,0.15)",
                        color: e.leapStatus === "Connected" ? "var(--color-river-blue)" : e.leapStatus === "Not Approved" ? "#e07070" : "var(--color-dome-gold)",
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>
                        {e.leapStatus}
                      </span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/journey/businesses`}
                      style={{ fontSize: "0.75rem", color: "var(--color-river-blue)", textDecoration: "none" }}
                    >
                      Journey →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Stage updates save immediately. Imported entrepreneurs can claim their account by registering with the same email.
      </p>
    </div>
  );
}

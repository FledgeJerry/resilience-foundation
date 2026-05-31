"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type StageBucket = {
  stage: string;
  label: string;
  count: number;
  businesses: { id: string; name: string; owner: string; updatedAt: string }[];
  hasMore: boolean;
};

type Proposal = {
  id: string;
  title: string;
  entityType: string;
  entityName: string;
  status: string;
  threshold: number;
  deadline: string | null;
  yes: number;
  no: number;
  abstain: number;
  total: number;
  pct: number;
  proposedBy: string;
  createdAt: string;
};

type Summary = {
  totalBusinesses: number;
  totalCoops: number;
  totalHousing: number;
  openProposals: number;
};

type Data = { summary: Summary; pipeline: StageBucket[]; proposals: Proposal[] };

const STAGE_COLORS: Record<string, string> = {
  IDEA: "var(--color-text-muted)",
  KNOW_GROUND: "#6BA3BE",
  FIND_PEOPLE: "#6BA3BE",
  BUILD_STRUCTURE: "var(--color-dome-gold)",
  TEST_SMALL: "var(--color-dome-gold)",
  GET_SUPPORT: "var(--color-teal-accent)",
  SUSTAIN: "var(--color-teal-accent)",
  GROW: "var(--color-limestone)",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtRel(s: string) {
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return `${weeks}w ago`;
  return fmtDate(s);
}

function deadlineLabel(deadline: string | null) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return { label: "expired", urgent: true };
  if (days === 0) return { label: "closes today", urgent: true };
  if (days <= 3) return { label: `${days}d left`, urgent: true };
  return { label: `${days}d left`, urgent: false };
}

function VoteBar({ yes, no, abstain, threshold }: { yes: number; no: number; abstain: number; threshold: number }) {
  const total = yes + no + abstain;
  if (total === 0) return <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>No votes yet</p>;
  const yesPct = Math.round((yes / total) * 100);
  const noPct = Math.round((no / total) * 100);
  const abstainPct = 100 - yesPct - noPct;
  const passing = yesPct >= threshold;

  return (
    <div>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--color-border)", marginBottom: "0.3rem" }}>
        <div style={{ width: `${yesPct}%`, background: passing ? "var(--color-teal-accent)" : "var(--color-dome-gold)" }} />
        <div style={{ width: `${noPct}%`, background: "var(--color-rust-accent, #e76f51)" }} />
        <div style={{ width: `${abstainPct}%`, background: "var(--color-border-strong)" }} />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.68rem", color: "var(--color-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
        <span style={{ color: passing ? "var(--color-teal-accent)" : "inherit" }}>✓ {yes}</span>
        <span>✗ {no}</span>
        {abstain > 0 && <span>— {abstain}</span>}
        <span style={{ marginLeft: "auto", color: passing ? "var(--color-teal-accent)" : "var(--color-dome-gold)" }}>
          {yesPct}% · need {threshold}%
        </span>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/pipeline")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [session, status, router]);

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;
  if (!data) return null;

  const { summary, pipeline, proposals } = data;
  const maxStageCount = Math.max(...pipeline.map((s) => s.count), 1);
  const openProposals = proposals.filter((p) => p.status === "OPEN");
  const draftProposals = proposals.filter((p) => p.status === "DRAFT");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Pipeline &amp; Proposals</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/admin" className="btn btn--ghost" style={{ fontSize: "0.82rem" }}>Users</Link>
          <Link href="/admin/cohort" className="btn btn--ghost" style={{ fontSize: "0.82rem" }}>Cohort</Link>
          <Link href="/admin/time" className="btn btn--ghost" style={{ fontSize: "0.82rem" }}>Time Log</Link>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {[
          { label: "Entrepreneurs", value: summary.totalBusinesses },
          { label: "Co-ops", value: summary.totalCoops },
          { label: "Housing projects", value: summary.totalHousing },
          { label: "Open proposals", value: summary.openProposals, highlight: summary.openProposals > 0 },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ background: "var(--color-surface)", border: `1px solid ${highlight ? "var(--color-dome-gold)" : "var(--color-border)"}`, borderRadius: 8, padding: "0.85rem 1rem" }}>
            <p style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.2rem" }}>{label}</p>
            <p style={{ fontSize: "1.6rem", fontWeight: 700, color: highlight ? "var(--color-dome-gold)" : "var(--color-limestone)", margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* Left: Pipeline funnel */}
        <div>
          <h2 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Entrepreneur Pipeline</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {pipeline.map((s) => {
              const barPct = Math.round((s.count / maxStageCount) * 100);
              const isOpen = expanded === s.stage;
              return (
                <div key={s.stage} style={{ border: "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden", background: "var(--color-surface)" }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.stage)}
                    style={{ width: "100%", background: "none", border: "none", cursor: s.count > 0 ? "pointer" : "default", padding: "0.6rem 0.85rem", textAlign: "left", display: "flex", alignItems: "center", gap: "0.75rem" }}
                  >
                    <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono, monospace)", color: STAGE_COLORS[s.stage] ?? "var(--color-text-muted)", width: "1.2rem", textAlign: "center", fontWeight: 700 }}>
                      {pipeline.indexOf(s) + 1}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--color-limestone)", flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono, monospace)", color: s.count > 0 ? "var(--color-dome-gold)" : "var(--color-text-muted)", minWidth: "1.5rem", textAlign: "right" }}>
                      {s.count}
                    </span>
                    <div style={{ width: 80, height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, height: "100%", background: STAGE_COLORS[s.stage] ?? "var(--color-border-strong)", borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                  </button>

                  {isOpen && s.count > 0 && (
                    <div style={{ borderTop: "1px solid var(--color-border)", padding: "0.5rem 0.85rem 0.75rem 2.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      {s.businesses.map((b) => (
                        <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                          <Link
                            href={`/admin/cohort?stage=${s.stage}`}
                            style={{ fontSize: "0.8rem", color: "var(--color-teal-accent)", textDecoration: "none" }}
                          >
                            {b.name}
                          </Link>
                          <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{b.owner} · {fmtRel(b.updatedAt)}</span>
                        </div>
                      ))}
                      {s.hasMore && (
                        <Link href={`/admin/cohort?stage=${s.stage}`} style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                          + more in cohort →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Proposals */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Open */}
          <div>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
              Open Proposals
              {openProposals.length > 0 && (
                <span style={{ marginLeft: "0.5rem", fontSize: "0.72rem", background: "var(--color-dome-gold)", color: "#000", borderRadius: 10, padding: "0.1rem 0.45rem", fontWeight: 700 }}>
                  {openProposals.length}
                </span>
              )}
            </h2>
            {openProposals.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>No open proposals.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {openProposals.map((p) => {
                  const dl = deadlineLabel(p.deadline);
                  return (
                    <div key={p.id} style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: "0.85rem 1rem", background: "var(--color-surface)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "0.88rem", color: "var(--color-limestone)", fontWeight: 500, margin: "0 0 0.15rem" }}>{p.title}</p>
                          <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", margin: 0 }}>
                            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.65rem", background: "var(--color-surface-raised)", padding: "0.1rem 0.35rem", borderRadius: 3, marginRight: "0.4rem" }}>
                              {p.entityType === "COOP" ? "co-op" : "housing"}
                            </span>
                            {p.entityName}
                          </p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", flexShrink: 0 }}>
                          {dl && (
                            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono, monospace)", color: dl.urgent ? "var(--color-rust-accent, #e76f51)" : "var(--color-text-muted)" }}>
                              {dl.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <VoteBar yes={p.yes} no={p.no} abstain={p.abstain} threshold={p.threshold} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drafts */}
          {draftProposals.length > 0 && (
            <div>
              <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--color-text-muted)" }}>
                Drafts ({draftProposals.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {draftProposals.map((p) => (
                  <div key={p.id} style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: "0.65rem 1rem", background: "var(--color-surface)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <div>
                      <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", margin: "0 0 0.1rem" }}>{p.title}</p>
                      <p style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", margin: 0 }}>{p.entityName} · by {p.proposedBy}</p>
                    </div>
                    <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{fmtRel(p.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proposals.length === 0 && (
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
              No proposals yet. They appear here when co-op or housing project members create governance votes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

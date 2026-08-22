"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type Assumption = { label: string; value: string };

type YearRow = {
  year: string;
  memberCount: string;
  newBuyIns: string;
  patronageDividends: string;
  avgAccountGrowth: string;
  avgCumulativeAccount: string;
  note: string;
};

type ReserveRow = {
  year: string;
  addedToReserves: string;
  totalReserves: string;
  note: string;
};

type Schedule = {
  narrative: string;
  assumptions: Assumption[];
  memberSchedule: YearRow[];
  collectiveReserves: ReserveRow[];
  patronageMethod: string;
  redemptionPolicy: string;
  equityPromise: string;
};

type Result = { schedule: Schedule; coopName: string; fields: number; total: number };

const th: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
  color: "var(--color-text-muted)",
  borderBottom: "1px solid var(--color-border-strong)",
  textAlign: "left" as const,
  whiteSpace: "nowrap" as const,
};

const tdBase: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  fontSize: "0.875rem",
  borderBottom: "1px solid var(--color-border)",
  verticalAlign: "top" as const,
};

const tdNum: React.CSSProperties = {
  ...tdBase,
  fontVariantNumeric: "tabular-nums",
  color: "var(--color-limestone)",
  fontWeight: 600,
};

const tdNote: React.CSSProperties = {
  ...tdBase,
  color: "var(--color-text-muted)",
  fontSize: "0.78rem",
  fontStyle: "italic",
};

function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {children}
      </table>
    </div>
  );
}

function SectionLabel({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <p style={{
      margin: "0 0 0.5rem",
      fontSize: "0.65rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: accent ? "var(--color-dome-gold)" : "var(--color-teal-accent)",
    }}>
      {children}
    </p>
  );
}

function EquityContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const coopId = searchParams.get("coopId");
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const generate = useCallback(async () => {
    if (!coopId) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/equity-schedule?coopId=${coopId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); }
      else { setResult(data); }
    } catch {
      setError("Something went wrong");
    }
    setGenerating(false);
  }, [coopId]);

  useEffect(() => {
    if (status === "authenticated" && coopId) generate();
  }, [status, coopId, generate]);

  if (status === "loading") return <p className="text-muted">Loading…</p>;

  const s = result?.schedule;

  return (
    <div style={{ maxWidth: "820px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Member Equity Schedule</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={generate} disabled={generating || !coopId} className="btn btn--secondary btn--sm">
            {generating ? "Generating…" : "Regenerate"}
          </button>
          {s && (
            <button onClick={() => downloadMarkdown(`${result?.coopName} — Member Equity Schedule.md`, jsonToMarkdown(s, "Member Equity Schedule"))} className="btn btn--secondary btn--sm">
              Download .md
            </button>
          )}
          {s && (
            <button onClick={() => window.print()} className="btn btn--primary btn--sm">
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {result && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          Built from {result.fields} of {result.total} equity fields completed in your handbook.
          {result.fields < result.total && ` Fill in more fields for a more accurate schedule.`}
        </p>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {generating && (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>Building your equity schedule…</p>
        </div>
      )}
      {!coopId && (
        <div className="alert" style={{ marginTop: "1rem" }}>
          No co-op selected. <a href="/documents">Go back and select a co-op.</a>
        </div>
      )}

      {s && !generating && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          {/* Narrative */}
          <div className="card" style={{ padding: "1.5rem 2rem" }}>
            <SectionLabel>How Member Equity Works Here</SectionLabel>
            <p style={{ margin: 0, lineHeight: 1.75, color: "var(--color-text-primary)" }}>{s.narrative}</p>
          </div>

          {/* Assumptions */}
          <div className="card" style={{ padding: "1.5rem 2rem" }}>
            <SectionLabel>Key Assumptions</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem 2rem", marginTop: "0.5rem" }}>
              {s.assumptions?.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>{a.label}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--color-limestone)", fontWeight: 600, textAlign: "right" }}>{a.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Member Capital Account Schedule */}
          <div>
            <SectionLabel accent>Member Capital Account Schedule — Years 1–3</SectionLabel>
            <DataTable>
              <thead>
                <tr style={{ background: "var(--color-surface)" }}>
                  <th style={th}>Year</th>
                  <th style={th}>Members</th>
                  <th style={th}>New Buy-Ins</th>
                  <th style={th}>Patronage to Accounts</th>
                  <th style={th}>Avg Account Growth</th>
                  <th style={th}>Avg Cumulative Balance</th>
                  <th style={{ ...th, minWidth: "180px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {s.memberSchedule?.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-raised)" }}>
                    <td style={{ ...tdBase, fontWeight: 700, color: "var(--color-dome-gold)" }}>{row.year}</td>
                    <td style={tdBase}>{row.memberCount}</td>
                    <td style={tdNum}>{row.newBuyIns}</td>
                    <td style={tdNum}>{row.patronageDividends}</td>
                    <td style={{ ...tdNum, color: "var(--color-teal-accent)" }}>{row.avgAccountGrowth}</td>
                    <td style={{ ...tdNum, color: "var(--color-limestone)" }}>{row.avgCumulativeAccount}</td>
                    <td style={tdNote}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          {/* Collective Reserves */}
          <div>
            <SectionLabel>Collective Reserve Schedule — Years 1–3</SectionLabel>
            <DataTable>
              <thead>
                <tr style={{ background: "var(--color-surface)" }}>
                  <th style={th}>Year</th>
                  <th style={th}>Added to Reserves</th>
                  <th style={th}>Total Reserves</th>
                  <th style={{ ...th, minWidth: "220px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {s.collectiveReserves?.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-raised)" }}>
                    <td style={{ ...tdBase, fontWeight: 700, color: "var(--color-dome-gold)" }}>{row.year}</td>
                    <td style={tdNum}>{row.addedToReserves}</td>
                    <td style={{ ...tdNum, color: "var(--color-teal-accent)" }}>{row.totalReserves}</td>
                    <td style={tdNote}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          {/* Patronage + Redemption */}
          <div className="card" style={{ padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <SectionLabel>Patronage Allocation Method</SectionLabel>
              <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.7, color: "var(--color-text-primary)" }}>{s.patronageMethod}</p>
            </div>
            <div>
              <SectionLabel>Equity Redemption Policy</SectionLabel>
              <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.7, color: "var(--color-text-primary)" }}>{s.redemptionPolicy}</p>
            </div>
          </div>

          {/* Equity Promise */}
          <div style={{
            background: "rgba(232, 200, 74, 0.06)",
            border: "1px solid rgba(232, 200, 74, 0.2)",
            borderRadius: "6px",
            padding: "1.25rem 1.5rem",
          }}>
            <SectionLabel accent>The Equity Promise</SectionLabel>
            <p style={{ margin: 0, lineHeight: 1.75, color: "var(--color-limestone)", fontSize: "0.95rem" }}>{s.equityPromise}</p>
          </div>

          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
            Part of Project 2026 — The Fledge, 1300 Eureka Street, Lansing, Michigan
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          table { font-size: 0.75rem; }
        }
        @media print {
          .site-nav, button { display: none !important; }
          .card { border: 1px solid #ccc !important; background: white !important; }
          p, td, th { color: black !important; }
        }
      `}</style>
    </div>
  );
}

export default function EquitySchedulePage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <EquityContent />
    </Suspense>
  );
}

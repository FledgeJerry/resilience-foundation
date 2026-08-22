"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown, printDate } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type YearRow = {
  year: string; revenue: string; laborCost: string; operatingCost: string;
  totalCost: string; surplusDeficit: string; isDeficit: boolean;
  toMemberAccounts: string; toReserves: string; toCommunity: string; note: string;
};
type PL = { breakEvenMonth: string; surplusNote: string; years: YearRow[] };
type Result = { pl: PL; coopName: string; fields: number; total: number };

const th: React.CSSProperties = { padding: "0.55rem 0.9rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--color-text-muted)", textAlign: "left" as const, borderBottom: "1px solid var(--color-border-strong)", whiteSpace: "nowrap" as const };
const tdLabel: React.CSSProperties = { padding: "0.55rem 0.9rem", fontSize: "0.82rem", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" };
const tdVal: React.CSSProperties = { padding: "0.55rem 0.9rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--color-limestone)", textAlign: "right" as const, fontVariantNumeric: "tabular-nums", borderBottom: "1px solid var(--color-border)" };

function PLContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const coopId = searchParams.get("coopId");
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const generate = useCallback(async () => {
    if (!coopId) return;
    setGenerating(true); setError("");
    try {
      const res = await fetch(`/api/documents/pl?coopId=${coopId}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setResult(data);
    } catch { setError("Something went wrong"); }
    setGenerating(false);
  }, [coopId]);

  useEffect(() => { if (status === "authenticated" && coopId) generate(); }, [status, coopId, generate]);
  if (status === "loading") return <p className="text-muted">Loading…</p>;

  const p = result?.pl;

  return (
    <div style={{ maxWidth: "820px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Profit & Loss Statement</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={generate} disabled={generating || !coopId} className="btn btn--secondary btn--sm">{generating ? "Generating…" : "Regenerate"}</button>
          {p && <button onClick={() => downloadMarkdown(`${result?.coopName} — Profit & Loss Statement.md`, jsonToMarkdown(p, "Profit & Loss Statement"))} className="btn btn--secondary btn--sm">Download .md</button>}
          {p && <button onClick={() => window.print()} className="btn btn--primary btn--sm">Print / Save PDF</button>}
        </div>
      </div>
      {result && <p className="no-print" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>Built from {result.fields} of {result.total} financial fields completed in your handbook.{result.fields < result.total && " Fill in more fields for a more accurate projection."}</p>}
      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {generating && <div className="card" style={{ padding: "3rem", textAlign: "center" }}><p style={{ color: "var(--color-text-muted)" }}>Building your P&L…</p></div>}
      {!coopId && <div className="alert" style={{ marginTop: "1rem" }}>No co-op selected. <a href="/documents">Go back and select a co-op.</a></div>}

      {p && !generating && (
        <div className="print-doc" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="print-only" style={{ paddingBottom: "0.75rem", borderBottom: "1px solid #ccc" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>Profit & Loss Statement</p>
            <p style={{ fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{result?.coopName} · Generated {printDate()}</p>
          </div>
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(74,155,142,0.08)", border: "1px solid rgba(74,155,142,0.3)", borderRadius: "6px", padding: "0.85rem 1.25rem" }}>
              <p style={{ margin: "0 0 0.2rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-teal-accent)" }}>Break-Even</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-limestone)" }}>{p.breakEvenMonth}</p>
            </div>
            <div style={{ flex: 1, minWidth: "200px", background: "rgba(232,200,74,0.06)", border: "1px solid rgba(232,200,74,0.2)", borderRadius: "6px", padding: "0.85rem 1.25rem" }}>
              <p style={{ margin: "0 0 0.2rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-dome-gold)" }}>Surplus Philosophy</p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{p.surplusNote}</p>
            </div>
          </div>

          <div style={{ overflowX: "auto", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-surface)" }}>
                  <th style={th}>Line Item</th>
                  {p.years?.map((y) => <th key={y.year} style={{ ...th, textAlign: "right" }}>{y.year}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Total Revenue", key: "revenue" as const, highlight: false },
                  { label: "Labor Costs", key: "laborCost" as const, highlight: false },
                  { label: "Operating Costs", key: "operatingCost" as const, highlight: false },
                  { label: "Total Costs", key: "totalCost" as const, highlight: false },
                ].map(({ label, key }) => (
                  <tr key={key}>
                    <td style={tdLabel}>{label}</td>
                    {p.years?.map((y) => <td key={y.year} style={tdVal}>{y[key]}</td>)}
                  </tr>
                ))}
                <tr style={{ background: "var(--color-surface)" }}>
                  <td style={{ ...tdLabel, fontWeight: 700, color: "var(--color-limestone)", borderTop: "2px solid var(--color-border-strong)" }}>Surplus / (Deficit)</td>
                  {p.years?.map((y) => (
                    <td key={y.year} style={{ ...tdVal, color: y.isDeficit ? "#C0614A" : "var(--color-teal-accent)", borderTop: "2px solid var(--color-border-strong)" }}>
                      {y.surplusDeficit}
                    </td>
                  ))}
                </tr>
                <tr><td style={{ ...tdLabel, color: "var(--color-text-muted)", fontSize: "0.75rem", fontStyle: "italic" }} colSpan={4}>Surplus Distribution</td></tr>
                {[
                  { label: "→ Member Capital Accounts", key: "toMemberAccounts" as const },
                  { label: "→ Collective Reserves", key: "toReserves" as const },
                  { label: "→ Community Benefit", key: "toCommunity" as const },
                ].map(({ label, key }) => (
                  <tr key={key}>
                    <td style={{ ...tdLabel, paddingLeft: "1.5rem", color: "var(--color-text-muted)" }}>{label}</td>
                    {p.years?.map((y) => <td key={y.year} style={{ ...tdVal, color: "var(--color-text-secondary)", fontWeight: 400 }}>{y[key]}</td>)}
                  </tr>
                ))}
                <tr>
                  <td style={{ ...tdLabel, fontSize: "0.75rem", fontStyle: "italic", color: "var(--color-text-muted)" }}>Note</td>
                  {p.years?.map((y) => <td key={y.year} style={{ ...tdVal, fontSize: "0.75rem", fontWeight: 400, color: "var(--color-text-muted)", fontStyle: "italic", textAlign: "left" }}>{y.note}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
            Part of Project 2026 — The Fledge, 1300 Eureka Street, Lansing, Michigan
          </p>
        </div>
      )}
      <style>{`@media print { .site-nav, button { display: none !important; } td, th { color: black !important; } }`}</style>
    </div>
  );
}

export default function PLPage() {
  return <Suspense fallback={<p className="text-muted">Loading…</p>}><PLContent /></Suspense>;
}

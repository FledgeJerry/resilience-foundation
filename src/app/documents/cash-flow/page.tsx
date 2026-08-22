"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type MonthRow = { month: string; revenue: string; wages: string; otherCosts: string; totalOut: string; netFlow: string; closingBalance: string; isDeficit: boolean };
type CashFlow = { openingBalance: string; breakEvenMonth: string; months: MonthRow[]; summary: string };
type Result = { cashFlow: CashFlow; coopName: string; fields: number; total: number };

const th: React.CSSProperties = { padding: "0.5rem 0.7rem", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border-strong)", textAlign: "right" as const, whiteSpace: "nowrap" as const };
const thLeft: React.CSSProperties = { ...th, textAlign: "left" as const };
const td: React.CSSProperties = { padding: "0.45rem 0.7rem", fontSize: "0.82rem", borderBottom: "1px solid var(--color-border)", textAlign: "right" as const, fontVariantNumeric: "tabular-nums", color: "var(--color-text-secondary)" };

function CashFlowContent() {
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
      const res = await fetch(`/api/documents/cash-flow?coopId=${coopId}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setResult(data);
    } catch { setError("Something went wrong"); }
    setGenerating(false);
  }, [coopId]);

  useEffect(() => { if (status === "authenticated" && coopId) generate(); }, [status, coopId, generate]);
  if (status === "loading") return <p className="text-muted">Loading…</p>;

  const cf = result?.cashFlow;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Cash Flow Statement</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName} — Year 1</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={generate} disabled={generating || !coopId} className="btn btn--secondary btn--sm">{generating ? "Generating…" : "Regenerate"}</button>
          {cf && <button onClick={() => downloadMarkdown(`${result?.coopName} — Cash Flow Statement.md`, jsonToMarkdown(cf, "Cash Flow Statement"))} className="btn btn--secondary btn--sm">Download .md</button>}
          {cf && <button onClick={() => window.print()} className="btn btn--primary btn--sm">Print / Save PDF</button>}
        </div>
      </div>
      {result && <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>Built from {result.fields} of {result.total} financial fields completed in your handbook.{result.fields < result.total && " Fill in more fields for a more accurate projection."}</p>}
      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {generating && <div className="card" style={{ padding: "3rem", textAlign: "center" }}><p style={{ color: "var(--color-text-muted)" }}>Building your cash flow…</p></div>}
      {!coopId && <div className="alert" style={{ marginTop: "1rem" }}>No co-op selected. <a href="/documents">Go back and select a co-op.</a></div>}

      {cf && !generating && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Key stats */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(46,109,164,0.08)", border: "1px solid rgba(46,109,164,0.3)", borderRadius: "6px", padding: "0.85rem 1.25rem" }}>
              <p style={{ margin: "0 0 0.2rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4A8EC4" }}>Opening Balance</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-limestone)" }}>{cf.openingBalance}</p>
            </div>
            <div style={{ background: "rgba(74,155,142,0.08)", border: "1px solid rgba(74,155,142,0.3)", borderRadius: "6px", padding: "0.85rem 1.25rem" }}>
              <p style={{ margin: "0 0 0.2rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-teal-accent)" }}>Break-Even</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-limestone)" }}>{cf.breakEvenMonth}</p>
            </div>
            <div style={{ flex: 1, minWidth: "220px", background: "rgba(232,200,74,0.06)", border: "1px solid rgba(232,200,74,0.2)", borderRadius: "6px", padding: "0.85rem 1.25rem" }}>
              <p style={{ margin: "0 0 0.2rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-dome-gold)" }}>Year 1 Summary</p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{cf.summary}</p>
            </div>
          </div>

          {/* Cash flow table */}
          <div style={{ overflowX: "auto", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
              <thead>
                <tr style={{ background: "var(--color-surface)" }}>
                  <th style={thLeft}>Month</th>
                  <th style={th}>Revenue In</th>
                  <th style={th}>Wages</th>
                  <th style={th}>Other Costs</th>
                  <th style={th}>Total Out</th>
                  <th style={th}>Net Flow</th>
                  <th style={th}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {cf.months?.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-raised)" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600, color: "var(--color-limestone)", whiteSpace: "nowrap" }}>{row.month}</td>
                    <td style={{ ...td, color: "var(--color-teal-accent)" }}>{row.revenue}</td>
                    <td style={td}>{row.wages}</td>
                    <td style={td}>{row.otherCosts}</td>
                    <td style={td}>{row.totalOut}</td>
                    <td style={{ ...td, fontWeight: 700, color: row.isDeficit ? "#C0614A" : "var(--color-teal-accent)" }}>{row.netFlow}</td>
                    <td style={{ ...td, fontWeight: 700, color: "var(--color-limestone)" }}>{row.closingBalance}</td>
                  </tr>
                ))}
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

export default function CashFlowPage() {
  return <Suspense fallback={<p className="text-muted">Loading…</p>}><CashFlowContent /></Suspense>;
}

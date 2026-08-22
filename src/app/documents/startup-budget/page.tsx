"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown, printDate } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type CostItem = { category: string; item: string; amount: string; note: string };
type FundingSource = { source: string; amount: string };
type Budget = { costItems: CostItem[]; totalNeeded: string; fundingSources: FundingSource[]; totalFunded: string; gap: string; inHandNote: string };
type Result = { budget: Budget; coopName: string; fields: number; total: number };

const th: React.CSSProperties = { padding: "0.55rem 0.9rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border-strong)", textAlign: "left" as const };
const td: React.CSSProperties = { padding: "0.55rem 0.9rem", fontSize: "0.85rem", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)", verticalAlign: "top" as const };
const tdAmt: React.CSSProperties = { ...td, fontWeight: 600, color: "var(--color-limestone)", textAlign: "right" as const, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" as const };

function BudgetContent() {
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
      const res = await fetch(`/api/documents/startup-budget?coopId=${coopId}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setResult(data);
    } catch { setError("Something went wrong"); }
    setGenerating(false);
  }, [coopId]);

  useEffect(() => { if (status === "authenticated" && coopId) generate(); }, [status, coopId, generate]);
  if (status === "loading") return <p className="text-muted">Loading…</p>;

  const b = result?.budget;

  // Group cost items by category
  const grouped = b?.costItems?.reduce<Record<string, CostItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {}) ?? {};

  return (
    <div style={{ maxWidth: "820px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Startup Budget</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={generate} disabled={generating || !coopId} className="btn btn--secondary btn--sm">{generating ? "Generating…" : "Regenerate"}</button>
          {b && <button onClick={() => downloadMarkdown(`${result?.coopName} — Startup Budget.md`, jsonToMarkdown(b, "Startup Budget"))} className="btn btn--secondary btn--sm">Download .md</button>}
          {b && <button onClick={() => window.print()} className="btn btn--primary btn--sm">Print / Save PDF</button>}
        </div>
      </div>
      {result && <p className="no-print" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>Built from {result.fields} of {result.total} budget fields completed in your handbook.{result.fields < result.total && " Fill in more fields for a more complete budget."}</p>}
      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {generating && <div className="card" style={{ padding: "3rem", textAlign: "center" }}><p style={{ color: "var(--color-text-muted)" }}>Building your startup budget…</p></div>}
      {!coopId && <div className="alert" style={{ marginTop: "1rem" }}>No co-op selected. <a href="/documents">Go back and select a co-op.</a></div>}

      {b && !generating && (
        <div className="print-doc" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="print-only" style={{ paddingBottom: "0.75rem", borderBottom: "1px solid #ccc" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>Startup Budget</p>
            <p style={{ fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{result?.coopName} · Generated {printDate()}</p>
          </div>

          {/* What we already have */}
          {b.inHandNote && (
            <div style={{ background: "rgba(74,155,142,0.08)", border: "1px solid rgba(74,155,142,0.3)", borderRadius: "6px", padding: "0.9rem 1.25rem" }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-teal-accent)" }}>Already In Hand</p>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-text-primary)", lineHeight: 1.6 }}>{b.inHandNote}</p>
            </div>
          )}

          {/* Cost table */}
          <div>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Startup Costs</p>
            <div style={{ overflowX: "auto", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface)" }}>
                    <th style={th}>Item</th>
                    <th style={{ ...th, textAlign: "right" }}>Amount</th>
                    <th style={th}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([category, items]) => (
                    <>
                      <tr key={`cat-${category}`} style={{ background: "var(--color-surface)" }}>
                        <td colSpan={3} style={{ padding: "0.4rem 0.9rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-dome-gold)", borderBottom: "1px solid var(--color-border)" }}>{category}</td>
                      </tr>
                      {items.map((item, i) => (
                        <tr key={`${category}-${i}`}>
                          <td style={td}>{item.item}</td>
                          <td style={tdAmt}>{item.amount}</td>
                          <td style={{ ...td, fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-text-muted)" }}>{item.note}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                  <tr style={{ background: "var(--color-surface)" }}>
                    <td style={{ ...td, fontWeight: 700, color: "var(--color-limestone)", borderTop: "2px solid var(--color-border-strong)" }}>Total Startup Capital Needed</td>
                    <td style={{ ...tdAmt, color: "var(--color-dome-gold)", fontSize: "1rem", borderTop: "2px solid var(--color-border-strong)" }}>{b.totalNeeded}</td>
                    <td style={{ ...td, borderTop: "2px solid var(--color-border-strong)" }} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Funding table */}
          <div>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Funding Sources</p>
            <div style={{ overflowX: "auto", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface)" }}>
                    <th style={th}>Source</th>
                    <th style={{ ...th, textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {b.fundingSources?.map((src, i) => (
                    <tr key={i}><td style={td}>{src.source}</td><td style={tdAmt}>{src.amount}</td></tr>
                  ))}
                  <tr style={{ background: "var(--color-surface)" }}>
                    <td style={{ ...td, fontWeight: 700, color: "var(--color-limestone)", borderTop: "2px solid var(--color-border-strong)" }}>Total Funded</td>
                    <td style={{ ...tdAmt, color: "var(--color-teal-accent)", fontSize: "1rem", borderTop: "2px solid var(--color-border-strong)" }}>{b.totalFunded}</td>
                  </tr>
                  <tr>
                    <td style={{ ...td, fontWeight: 700, color: "var(--color-limestone)" }}>Gap</td>
                    <td style={{ ...tdAmt, color: b.gap === "$0" || b.gap === "$0.00" ? "var(--color-teal-accent)" : "#C0614A", fontSize: "1rem" }}>{b.gap}</td>
                  </tr>
                </tbody>
              </table>
            </div>
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

export default function StartupBudgetPage() {
  return <Suspense fallback={<p className="text-muted">Loading…</p>}><BudgetContent /></Suspense>;
}

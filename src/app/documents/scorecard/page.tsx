"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type Kpi = { label: string; target: string; measure: string; trigger: string };
type BottomLine = { name: string; commitment: string; kpis: Kpi[] };
type Scorecard = { vision: string; reviewCadence: string; bottomLines: BottomLine[] };
type Result = { scorecard: Scorecard; coopName: string; fields: number; total: number };

const LINE_STYLES: Record<string, { border: string; label: string; bg: string }> = {
  People:    { border: "#2E6DA4", label: "#4A8EC4", bg: "rgba(46, 109, 164, 0.08)" },
  Planet:    { border: "#4A9B8E", label: "#4A9B8E", bg: "rgba(74, 155, 142, 0.08)" },
  Profit:    { border: "#E8C84A", label: "#E8C84A", bg: "rgba(232, 200, 74, 0.08)" },
  Ownership: { border: "#9B74C4", label: "#B094D4", bg: "rgba(155, 116, 196, 0.08)" },
};

function BottomLineCard({ line }: { line: BottomLine }) {
  const style = LINE_STYLES[line.name] ?? LINE_STYLES.People;
  return (
    <div style={{
      background: "var(--color-surface)",
      border: `1px solid ${style.border}`,
      borderRadius: "8px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ background: style.bg, borderBottom: `1px solid ${style.border}`, padding: "1rem 1.25rem" }}>
        <p style={{ margin: "0 0 0.3rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: style.label }}>
          Bottom Line
        </p>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "var(--color-limestone)" }}>{line.name}</h3>
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{line.commitment}</p>
      </div>

      {/* KPIs */}
      <div style={{ padding: "0.75rem 0" }}>
        {line.kpis?.map((kpi, i) => (
          <div key={i} style={{
            padding: "0.75rem 1.25rem",
            borderBottom: i < line.kpis.length - 1 ? "1px solid var(--color-border)" : "none",
          }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 700, color: style.label }}>{kpi.label}</p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 0.75rem", fontSize: "0.8rem" }}>
              <span style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Target</span>
              <span style={{ color: "var(--color-limestone)", fontWeight: 600 }}>{kpi.target}</span>
              <span style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Measure</span>
              <span style={{ color: "var(--color-text-secondary)" }}>{kpi.measure}</span>
              <span style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>If missed</span>
              <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>{kpi.trigger}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorecardContent() {
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
      const res = await fetch(`/api/documents/scorecard?coopId=${coopId}`);
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

  const s = result?.scorecard;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Four Bottom Lines Scorecard</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={generate} disabled={generating || !coopId} className="btn btn--secondary btn--sm">
            {generating ? "Generating…" : "Regenerate"}
          </button>
          {s && (
            <button onClick={() => downloadMarkdown(`${result?.coopName} — Four Bottom Lines Scorecard.md`, jsonToMarkdown(s, "Four Bottom Lines Scorecard"))} className="btn btn--secondary btn--sm">
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
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          Built from {result.fields} of {result.total} scorecard fields completed in your handbook.
          {result.fields < result.total && ` Fill in more fields for sharper targets.`}
        </p>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {generating && (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>Building your scorecard…</p>
        </div>
      )}
      {!coopId && (
        <div className="alert" style={{ marginTop: "1rem" }}>
          No co-op selected. <a href="/documents">Go back and select a co-op.</a>
        </div>
      )}

      {s && !generating && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Vision + cadence banner */}
          <div style={{
            background: "rgba(232, 200, 74, 0.06)",
            border: "1px solid rgba(232, 200, 74, 0.2)",
            borderRadius: "8px",
            padding: "1.1rem 1.5rem",
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}>
            <div style={{ flex: "1 1 300px" }}>
              <p style={{ margin: "0 0 0.3rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-dome-gold)" }}>Vision</p>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.65, color: "var(--color-limestone)" }}>{s.vision}</p>
            </div>
            <div style={{ flex: "0 1 auto" }}>
              <p style={{ margin: "0 0 0.3rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-dome-gold)" }}>Review Cadence</p>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.65, color: "var(--color-limestone)" }}>{s.reviewCadence}</p>
            </div>
          </div>

          {/* Four bottom line cards — 2x2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {s.bottomLines?.map((line) => (
              <BottomLineCard key={line.name} line={line} />
            ))}
          </div>

          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
            Part of Project 2026 — The Fledge, 1300 Eureka Street, Lansing, Michigan
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
        @media print {
          .site-nav, button { display: none !important; }
          div[style*="background: rgba"] { background: #f8f8f8 !important; }
          p, span { color: black !important; }
        }
      `}</style>
    </div>
  );
}

export default function ScorecardPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ScorecardContent />
    </Suspense>
  );
}

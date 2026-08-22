"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type Summary = {
  coopName: string;
  tagline: string;
  overview: string;
  problem: string;
  solution: string;
  market: string;
  impact: string;
  team: string;
  financials: string;
  vision: string;
  values: string;
};

type Result = { summary: Summary; coopName: string; fields: number; total: number };

function Section({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p style={{
        margin: "0 0 0.35rem",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: accent ? "var(--color-dome-gold)" : "var(--color-teal-accent)",
      }}>
        {label}
      </p>
      <p style={{ margin: 0, lineHeight: 1.7, color: "var(--color-text-primary)", fontSize: "0.92rem" }}>
        {text}
      </p>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--color-border)", margin: "1.5rem 0" }} />;
}

function ExecSummaryContent() {
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
      const res = await fetch(`/api/documents/executive-summary?coopId=${coopId}`);
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

  const s = result?.summary;

  return (
    <div style={{ maxWidth: "820px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Executive Summary</h1>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={generate}
            disabled={generating || !coopId}
            className="btn btn--secondary btn--sm"
          >
            {generating ? "Generating…" : "Regenerate"}
          </button>
          {s && (
            <button onClick={() => downloadMarkdown(`${result?.coopName} — Executive Summary.md`, jsonToMarkdown(s, "Executive Summary"))} className="btn btn--secondary btn--sm">
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
          Built from {result.fields} of {result.total} fields completed in your handbook.
          {result.fields < result.total && ` Fill in more fields to strengthen this document.`}
        </p>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {generating && (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>Generating your executive summary…</p>
        </div>
      )}

      {!coopId && (
        <div className="alert" style={{ marginTop: "1rem" }}>
          No co-op selected. <a href="/documents">Go back and select a co-op.</a>
        </div>
      )}

      {s && !generating && (
        <div className="card" style={{ padding: "2rem 2.5rem" }}>

          {/* Header */}
          <div style={{ marginBottom: "2rem", borderBottom: "2px solid var(--color-dome-gold)", paddingBottom: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.6rem", color: "var(--color-limestone)" }}>
              {s.coopName}
            </h2>
            <p style={{ margin: 0, fontSize: "1rem", color: "var(--color-steel-muted)", fontStyle: "italic" }}>
              {s.tagline}
            </p>
          </div>

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem 3rem" }}>

            {/* Left column */}
            <div>
              <Section label="Who We Are" text={s.overview} />
              <Section label="The Problem We Solve" text={s.problem} />
              <Section label="Our Solution" text={s.solution} />
              <Section label="Our Values" text={s.values} accent />
            </div>

            {/* Right column */}
            <div>
              <Section label="Market Opportunity" text={s.market} />
              <Section label="Community Impact" text={s.impact} />
              <Section label="Our Team" text={s.team} />
              <Section label="Financials" text={s.financials} accent />
            </div>
          </div>

          <Divider />

          {/* Vision — full width, highlighted */}
          <div style={{
            background: "rgba(232, 200, 74, 0.06)",
            border: "1px solid rgba(232, 200, 74, 0.2)",
            borderRadius: "6px",
            padding: "1.25rem 1.5rem",
          }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-dome-gold)" }}>
              Our Vision
            </p>
            <p style={{ margin: 0, lineHeight: 1.75, color: "var(--color-limestone)", fontSize: "0.95rem" }}>
              {s.vision}
            </p>
          </div>

          <p style={{ marginTop: "1.75rem", fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center" }}>
            Part of Project 2026 — The Fledge, 1300 Eureka Street, Lansing, Michigan
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .exec-grid { grid-template-columns: 1fr !important; }
        }
        @media print {
          .site-nav, button { display: none !important; }
          .card { border: 1px solid #ccc !important; background: white !important; color: black !important; }
          p, h2 { color: black !important; }
        }
      `}</style>
    </div>
  );
}

export default function ExecutiveSummaryPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ExecSummaryContent />
    </Suspense>
  );
}

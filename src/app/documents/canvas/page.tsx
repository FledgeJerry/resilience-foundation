"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type CanvasData = {
  keyPartners: string[];
  keyActivities: string[];
  keyResources: string[];
  valueProposition: string[];
  ownershipCommunity: string[];
  channels: string[];
  memberSegments: string[];
  costStructure: string[];
  revenueAndSurplus: string[];
};

type Result = { canvas: CanvasData; coopName: string; fields: number; total: number };

const BLOCK_COLORS = {
  partners:  { bg: "#1E3347", border: "rgba(46, 109, 164, 0.4)", label: "#4A8EC4" },
  activities:{ bg: "#1A3040", border: "rgba(74, 155, 142, 0.4)", label: "#4A9B8E" },
  resources: { bg: "#1A2E3A", border: "rgba(74, 155, 142, 0.3)", label: "#4A9B8E" },
  value:     { bg: "#1E2E1A", border: "rgba(232, 200, 74, 0.5)",  label: "#E8C84A" },
  community: { bg: "#1E2A3A", border: "rgba(74, 155, 142, 0.4)", label: "#4A9B8E" },
  channels:  { bg: "#1A2838", border: "rgba(74, 155, 142, 0.3)", label: "#4A9B8E" },
  segments:  { bg: "#1E3347", border: "rgba(46, 109, 164, 0.4)", label: "#4A8EC4" },
  cost:      { bg: "#2A1E1A", border: "rgba(192, 57, 43, 0.3)",  label: "#C0614A" },
  revenue:   { bg: "#1A2A1A", border: "rgba(74, 155, 142, 0.5)", label: "#4A9B8E" },
};

function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>Fill in more handbook fields to complete this block.</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", fontSize: "0.82rem", lineHeight: 1.45, color: "#D4E0EC" }}>
          <span style={{ color: "var(--color-dome-gold)", flexShrink: 0, marginTop: "2px" }}>·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CanvasBlock({
  label, items, color, style,
}: {
  label: string;
  items: string[];
  color: typeof BLOCK_COLORS[keyof typeof BLOCK_COLORS];
  style?: CSSProperties;
}) {
  return (
    <div style={{
      background: color.bg,
      border: `1px solid ${color.border}`,
      borderRadius: "6px",
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.6rem",
      overflow: "hidden",
      ...style,
    }}>
      <p style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: color.label }}>
        {label}
      </p>
      <BulletList items={items} />
    </div>
  );
}

function CanvasContent() {
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
      const res = await fetch(`/api/documents/canvas?coopId=${coopId}`);
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

  const c = result?.canvas;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Business Model Canvas</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={generate}
            disabled={generating || !coopId}
            className="btn btn--secondary btn--sm"
          >
            {generating ? "Generating…" : "Regenerate"}
          </button>
          {result && (
            <>
              <button
                onClick={() => downloadMarkdown(`${result.coopName} — Business Model Canvas.md`, jsonToMarkdown(result.canvas, "Business Model Canvas"))}
                className="btn btn--secondary btn--sm"
              >
                Download .md
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn--primary btn--sm"
              >
                Print / Save PDF
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          Built from {result.fields} of {result.total} canvas fields completed in your handbook.
          {result.fields < result.total && ` Fill in more fields to strengthen this canvas.`}
        </p>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {generating && (
        <div className="card" style={{ padding: "4rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>Building your canvas…</p>
        </div>
      )}

      {!coopId && (
        <div className="alert" style={{ marginTop: "1rem" }}>
          No co-op selected. <a href="/documents">Go back and select a co-op.</a>
        </div>
      )}

      {c && !generating && (
        <div style={{
          display: "grid",
          gridTemplateAreas: `
            "partners activities value community segments"
            "partners resources  value channels   segments"
            "cost     cost       cost  revenue    revenue"
          `,
          gridTemplateColumns: "1fr 1fr 1.4fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr auto",
          gap: "6px",
          minHeight: "520px",
        }}>
          <CanvasBlock label="Key Partners"    items={c.keyPartners}       color={BLOCK_COLORS.partners}  style={{ gridArea: "partners" }} />
          <CanvasBlock label="Key Activities"  items={c.keyActivities}     color={BLOCK_COLORS.activities} style={{ gridArea: "activities" }} />
          <CanvasBlock label="Value Proposition" items={c.valueProposition} color={BLOCK_COLORS.value}     style={{ gridArea: "value" }} />
          <CanvasBlock label="Ownership Community" items={c.ownershipCommunity} color={BLOCK_COLORS.community} style={{ gridArea: "community" }} />
          <CanvasBlock label="Member Segments" items={c.memberSegments}    color={BLOCK_COLORS.segments}  style={{ gridArea: "segments" }} />
          <CanvasBlock label="Key Resources"   items={c.keyResources}      color={BLOCK_COLORS.resources} style={{ gridArea: "resources" }} />
          <CanvasBlock label="Channels"        items={c.channels}          color={BLOCK_COLORS.channels}  style={{ gridArea: "channels" }} />
          <CanvasBlock label="Cost Structure"  items={c.costStructure}     color={BLOCK_COLORS.cost}      style={{ gridArea: "cost" }} />
          <CanvasBlock label="Revenue + Surplus Distribution" items={c.revenueAndSurplus} color={BLOCK_COLORS.revenue} style={{ gridArea: "revenue" }} />
        </div>
      )}

      {c && !generating && (
        <p style={{ marginTop: "1.25rem", fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center" }}>
          Part of Project 2026 — The Fledge, 1300 Eureka Street, Lansing, Michigan
        </p>
      )}

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .site-nav, .btn, .eyebrow, h1, p { color: black !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <CanvasContent />
    </Suspense>
  );
}

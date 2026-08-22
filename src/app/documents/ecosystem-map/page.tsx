"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown, printDate } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type NodeType = "coopNetwork" | "supplier" | "collaborator" | "anchor" | "fledge";

type EcoNode = { label: string; type: NodeType; relationship: string; ring: number };
type MapData = { coopName: string; tagline: string; geography: string; valueTrap: string; nodes: EcoNode[] };
type Result = { map: MapData; coopName: string; fields: number; total: number };

const TYPE_META: Record<NodeType, { color: string; fill: string; stroke: string; legend: string }> = {
  coopNetwork:  { color: "#4A9B8E", fill: "rgba(74,155,142,0.18)",  stroke: "#4A9B8E", legend: "Co-op Network" },
  supplier:     { color: "#2E6DA4", fill: "rgba(46,109,164,0.18)",  stroke: "#2E6DA4", legend: "Supplier Partners" },
  collaborator: { color: "#4A8EC4", fill: "rgba(74,142,196,0.18)",  stroke: "#4A8EC4", legend: "Collaborators" },
  anchor:       { color: "#E8C84A", fill: "rgba(232,200,74,0.18)",  stroke: "#E8C84A", legend: "Community Anchors" },
  fledge:       { color: "#9AB0C8", fill: "rgba(154,176,200,0.18)", stroke: "#9AB0C8", legend: "The Fledge / Project 2026" },
};

const RING_RADII = [0, 140, 245, 335];

function wrapLabel(label: string, maxWidth: number): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxWidth) { current = test; }
    else { if (current) lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [label];
}

function EcosystemSVG({ data }: { data: MapData }) {
  const W = 800, H = 800, cx = 400, cy = 400;

  // Group nodes by ring
  const byRing: Record<number, EcoNode[]> = {};
  for (const node of data.nodes ?? []) {
    const r = node.ring ?? 2;
    (byRing[r] ??= []).push(node);
  }

  // Compute positions
  type PositionedNode = EcoNode & { x: number; y: number; angle: number };
  const positioned: PositionedNode[] = [];

  for (const [ringStr, nodes] of Object.entries(byRing)) {
    const ring = parseInt(ringStr);
    const r = RING_RADII[ring] ?? 245;
    // Offset start angle per ring so nodes don't stack vertically
    const startAngle = ring === 1 ? -Math.PI / 2 : ring === 2 ? -Math.PI / 3 : -Math.PI / 4;
    nodes.forEach((node, i) => {
      const angle = startAngle + (i / nodes.length) * 2 * Math.PI;
      positioned.push({ ...node, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle });
    });
  }

  const centerLines = wrapLabel(data.coopName, 14);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxHeight: "600px" }}>
      {/* Ring circles */}
      {[1, 2, 3].map((ring) => (
        <circle key={ring} cx={cx} cy={cy} r={RING_RADII[ring]} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}

      {/* Spoke lines */}
      {positioned.map((node, i) => {
        const meta = TYPE_META[node.type] ?? TYPE_META.anchor;
        return (
          <line key={`line-${i}`}
            x1={cx} y1={cy} x2={node.x} y2={node.y}
            stroke={meta.color} strokeWidth={1} strokeOpacity={0.3}
            strokeDasharray={node.ring === 3 ? "4 4" : "none"}
          />
        );
      })}

      {/* Nodes */}
      {positioned.map((node, i) => {
        const meta = TYPE_META[node.type] ?? TYPE_META.anchor;
        const lines = wrapLabel(node.label, 13);
        const nodeR = 30;
        // Determine text anchor based on x position
        const textAnchor = node.x < cx - 20 ? "end" : node.x > cx + 20 ? "start" : "middle";
        const labelOffsetX = node.x < cx - 20 ? -(nodeR + 6) : node.x > cx + 20 ? (nodeR + 6) : 0;
        const labelOffsetY = Math.abs(node.x - cx) <= 20 ? (node.y < cy ? -(nodeR + 8) : (nodeR + 8)) : 0;

        return (
          <g key={`node-${i}`}>
            <circle cx={node.x} cy={node.y} r={nodeR} fill={meta.fill} stroke={meta.stroke} strokeWidth={1.5} />
            {lines.map((line, li) => (
              <text key={li}
                x={node.x + labelOffsetX}
                y={node.y + labelOffsetY + li * 13 - (lines.length - 1) * 6.5}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="var(--font-sans, sans-serif)"
                fontWeight={600}
                fill={meta.color}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Center node */}
      <circle cx={cx} cy={cy} r={68} fill="rgba(232,200,74,0.12)" stroke="#E8C84A" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={64} fill="rgba(28,43,58,0.9)" stroke="none" />
      {centerLines.map((line, i) => (
        <text key={i}
          x={cx} y={cy + (i - (centerLines.length - 1) / 2) * 16}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={13} fontWeight={700}
          fontFamily="var(--font-sans, sans-serif)"
          fill="#F4F1E8"
        >
          {line}
        </text>
      ))}
      <text x={cx} y={cy + centerLines.length * 9 + 6}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fill="#9AB0C8"
        fontFamily="var(--font-sans, sans-serif)"
      >
        {data.geography}
      </text>
    </svg>
  );
}

function EcosystemContent() {
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
      const res = await fetch(`/api/documents/ecosystem-map?coopId=${coopId}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setResult(data);
    } catch { setError("Something went wrong"); }
    setGenerating(false);
  }, [coopId]);

  useEffect(() => { if (status === "authenticated" && coopId) generate(); }, [status, coopId, generate]);
  if (status === "loading") return <p className="text-muted">Loading…</p>;

  const m = result?.map;

  // Group nodes by type for the legend table
  const grouped = m?.nodes?.reduce<Record<string, EcoNode[]>>((acc, n) => {
    (acc[n.type] ??= []).push(n);
    return acc;
  }, {}) ?? {};

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Ecosystem Map</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={generate} disabled={generating || !coopId} className="btn btn--secondary btn--sm">{generating ? "Generating…" : "Regenerate"}</button>
          {m && <button onClick={() => downloadMarkdown(`${result?.coopName} — Ecosystem Map.md`, jsonToMarkdown(m, "Ecosystem Map"))} className="btn btn--secondary btn--sm">Download .md</button>}
          {m && <button onClick={() => window.print()} className="btn btn--primary btn--sm">Print / Save PDF</button>}
        </div>
      </div>

      {result && (
        <p className="no-print" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          Built from {result.fields} of {result.total} ecosystem fields in your handbook.
          {result.fields < result.total && " Fill in more partner fields to expand your map."}
        </p>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {generating && <div className="card" style={{ padding: "3rem", textAlign: "center" }}><p style={{ color: "var(--color-text-muted)" }}>Building your ecosystem map…</p></div>}
      {!coopId && <div className="alert" style={{ marginTop: "1rem" }}>No co-op selected. <a href="/documents">Go back and select a co-op.</a></div>}

      {m && !generating && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="print-only" style={{ paddingBottom: "0.75rem", borderBottom: "1px solid #ccc" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>Ecosystem Map</p>
            <p style={{ fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{result?.coopName} · Generated {printDate()}</p>
          </div>

          {/* Map */}
          <div className="card" style={{ padding: "1rem", background: "var(--color-surface)" }}>
            <EcosystemSVG data={m} />
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {(Object.keys(TYPE_META) as NodeType[]).filter((t) => grouped[t]?.length).map((type) => {
              const meta = TYPE_META[type];
              return (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.fill, border: `1.5px solid ${meta.stroke}`, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: "0.75rem", color: meta.color }}>{meta.legend}</span>
                </div>
              );
            })}
          </div>

          {/* Value trap callout */}
          {m.valueTrap && (
            <div style={{ background: "rgba(74,155,142,0.08)", border: "1px solid rgba(74,155,142,0.3)", borderRadius: "6px", padding: "0.9rem 1.25rem" }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-teal-accent)" }}>Value Stays Local</p>
              <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6, color: "var(--color-text-primary)" }}>{m.valueTrap}</p>
            </div>
          )}

          {/* Node directory */}
          {(Object.entries(grouped) as [NodeType, EcoNode[]][]).map(([type, nodes]) => {
            const meta = TYPE_META[type];
            return (
              <div key={type}>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: meta.color }}>{meta.legend}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.5rem" }}>
                  {nodes.map((node, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.6rem 0.75rem", background: meta.fill, border: `1px solid ${meta.stroke}`, borderRadius: "5px", opacity: 0.9 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0, marginTop: "5px" }} />
                      <div>
                        <p style={{ margin: "0 0 0.1rem", fontSize: "0.85rem", fontWeight: 600, color: meta.color }}>{node.label}</p>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{node.relationship}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
            Part of Project 2026 — The Fledge, 1300 Eureka Street, Lansing, Michigan
          </p>
        </div>
      )}

      <style>{`
        @media print {
          .site-nav, button { display: none !important; }
          .card { background: white !important; border: 1px solid #ccc !important; }
        }
      `}</style>
    </div>
  );
}

export default function EcosystemMapPage() {
  return <Suspense fallback={<p className="text-muted">Loading…</p>}><EcosystemContent /></Suspense>;
}

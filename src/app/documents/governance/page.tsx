"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type IcaPrinciple = { number: number; name: string; text: string };

type Governance = {
  legalStructure: string;
  foundingGroup: string;
  membershipPath: string;
  boardGovernance: string;
  decisionMaking: string;
  memberMeetings: string;
  surplusDistribution: string;
  workerStandards: string;
  accessibility: string;
  conflictResolution: string;
  bylawsStatus: string;
  icaPrinciples: IcaPrinciple[];
  accountability: string;
};

type Result = { governance: Governance; coopName: string; fields: number; total: number };

function Section({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div>
      <p style={{
        margin: "0 0 0.4rem",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: accent ? "var(--color-dome-gold)" : "var(--color-teal-accent)",
      }}>
        {label}
      </p>
      <p style={{ margin: 0, lineHeight: 1.75, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
        {text}
      </p>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--color-border)", margin: "1.5rem 0" }} />;
}

function GovernanceContent() {
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
      const res = await fetch(`/api/documents/governance?coopId=${coopId}`);
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

  const g = result?.governance;

  return (
    <div style={{ maxWidth: "820px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Governance Summary</h1>
          {result && <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>{result.coopName}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={generate} disabled={generating || !coopId} className="btn btn--secondary btn--sm">
            {generating ? "Generating…" : "Regenerate"}
          </button>
          {g && (
            <button onClick={() => downloadMarkdown(`${result?.coopName} — Governance Summary.md`, jsonToMarkdown(g, "Governance Summary"))} className="btn btn--secondary btn--sm">
              Download .md
            </button>
          )}
          {g && (
            <button onClick={() => window.print()} className="btn btn--primary btn--sm">
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {result && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          Built from {result.fields} of {result.total} governance fields completed in your handbook.
          {result.fields < result.total && ` Fill in more fields to strengthen this document.`}
        </p>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {generating && (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>Generating your governance summary…</p>
        </div>
      )}
      {!coopId && (
        <div className="alert" style={{ marginTop: "1rem" }}>
          No co-op selected. <a href="/documents">Go back and select a co-op.</a>
        </div>
      )}

      {g && !generating && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Legal + Founding */}
          <div className="card" style={{ padding: "1.75rem 2rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2.5rem" }}>
              <Section label="Legal Structure" text={g.legalStructure} />
              <Section label="Founding Group" text={g.foundingGroup} />
            </div>
          </div>

          {/* Membership */}
          <div className="card" style={{ padding: "1.75rem 2rem" }}>
            <Section label="Path to Membership" text={g.membershipPath} />
            <Divider />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2.5rem" }}>
              <Section label="Worker Standards" text={g.workerStandards} />
              <Section label="Accessibility Commitments" text={g.accessibility} />
            </div>
          </div>

          {/* Board + Decisions */}
          <div className="card" style={{ padding: "1.75rem 2rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2.5rem" }}>
              <Section label="Board of Directors" text={g.boardGovernance} />
              <Section label="Member Meetings" text={g.memberMeetings} />
            </div>
            <Divider />
            <Section label="Decision-Making Structure" text={g.decisionMaking} />
          </div>

          {/* ICA Principles */}
          <div className="card" style={{ padding: "1.75rem 2rem" }}>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-dome-gold)" }}>
              The Seven Cooperative Principles
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem 2rem" }}>
              {g.icaPrinciples?.map((p) => (
                <div key={p.number} style={{ paddingLeft: "1rem", borderLeft: "2px solid var(--color-border-strong)" }}>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-dome-gold)" }}>
                    {p.number}. {p.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Surplus + Conflict + Bylaws */}
          <div className="card" style={{ padding: "1.75rem 2rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2.5rem" }}>
              <Section label="Surplus Distribution" text={g.surplusDistribution} accent />
              <Section label="Conflict Resolution" text={g.conflictResolution} />
            </div>
            <Divider />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2.5rem" }}>
              <Section label="Bylaws Status" text={g.bylawsStatus} />
              <Section label="Governance Accountability" text={g.accountability} />
            </div>
          </div>

          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
            Part of Project 2026 — The Fledge, 1300 Eureka Street, Lansing, Michigan
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .card > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
        @media print {
          .site-nav, button { display: none !important; }
          .card { border: 1px solid #ccc !important; background: white !important; }
          p { color: black !important; }
        }
      `}</style>
    </div>
  );
}

export default function GovernancePage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <GovernanceContent />
    </Suspense>
  );
}

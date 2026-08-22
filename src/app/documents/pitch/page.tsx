"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { downloadMarkdown } from "@/lib/download";

type Result = { content: string; fields: number; total: number };

function PitchContent() {
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
      const res = await fetch(`/api/documents/pitch?coopId=${coopId}`);
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

  return (
    <div style={{ maxWidth: "680px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="eyebrow">Output Document</span>
          <h1 style={{ margin: 0 }}>Community Pitch</h1>
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
                onClick={() => navigator.clipboard.writeText(result.content)}
                className="btn btn--secondary btn--sm"
              >
                Copy
              </button>
              <button
                onClick={() => downloadMarkdown("Community Pitch.md", result.content)}
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
          Built from {result.fields} of {result.total} pitch fields completed in your handbook.
          {result.fields < result.total && ` Fill in more fields in your handbook to strengthen this document.`}
        </p>
      )}

      {error && <div className="alert alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {generating && (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>Generating your pitch…</p>
        </div>
      )}

      {result && !generating && (
        <div className="card" style={{ padding: "2rem", lineHeight: 1.7 }}>
          <MarkdownRenderer content={result.content} />
        </div>
      )}

      {!coopId && (
        <div className="alert" style={{ marginTop: "1rem" }}>
          No co-op selected. <a href="/documents">Go back and select a co-op.</a>
        </div>
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

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: "1.1rem", color: "var(--color-limestone)", marginTop: "1.5rem", marginBottom: "0.4rem" }}>{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{line.slice(2)}</h1>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} style={{ fontWeight: 700, color: "var(--color-limestone)" }}>{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <div key={i} style={{ height: "0.5rem" }} />;
        return <p key={i} style={{ margin: "0 0 0.5rem" }}>{line}</p>;
      })}
    </div>
  );
}

export default function PitchPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <PitchContent />
    </Suspense>
  );
}

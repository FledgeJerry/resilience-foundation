"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DOCUMENTS } from "@/lib/document-list";

type Coop = { id: string; name: string; role: string };

export default function DocumentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [coops, setCoops] = useState<Coop[]>([]);
  const [coopId, setCoopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    fetch("/api/coops")
      .then((r) => r.json())
      .then((data: Coop[]) => {
        setCoops(data);
        if (data.length === 1) setCoopId(data[0].id);
        setLoading(false);
      });
  }, [status, router]);

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;

  if (coops.length === 0) {
    return (
      <div style={{ maxWidth: "480px" }}>
        <span className="eyebrow">Output Documents</span>
        <h1>No co-op yet</h1>
        <p>Start your handbook first to generate output documents.</p>
        <Link href="/handbook" className="btn btn--primary" style={{ marginTop: "1rem", display: "inline-block" }}>Go to Handbook</Link>
      </div>
    );
  }

  const activeCoop = coops.find((c) => c.id === coopId);

  return (
    <div style={{ maxWidth: "760px" }}>
      <span className="eyebrow">Output Documents</span>
      <h1 style={{ marginBottom: "0.25rem" }}>Your Business Plan Package</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-text-secondary)" }}>
        Generated from your handbook answers. The more you fill in, the better each document gets.
      </p>

      {coops.length > 1 && (
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Co-op:</span>
          <select value={coopId ?? ""} onChange={(e) => setCoopId(e.target.value)} style={{ width: "auto" }}>
            <option value="">Select a co-op</option>
            {coops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {activeCoop && (
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "2rem" }}>
          Generating for: <strong style={{ color: "var(--color-limestone)" }}>{activeCoop.name}</strong>
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {DOCUMENTS.map((doc) => (
          <div
            key={doc.slug}
            className="card"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}
          >
            <div>
              <p style={{ fontWeight: 600, margin: "0 0 0.2rem", color: "var(--color-limestone)" }}>{doc.title}</p>
              <p style={{ fontSize: "0.85rem", margin: 0, color: "var(--color-text-secondary)" }}>{doc.desc}</p>
            </div>
            <Link
              href={`/documents/${doc.slug}${coopId ? `?coopId=${coopId}` : ""}`}
              className="btn btn--primary btn--sm"
              style={{ flexShrink: 0 }}
            >
              Generate
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

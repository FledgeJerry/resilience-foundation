"use client";

import Link from "next/link";
import { DOCUMENTS } from "@/lib/document-list";

export default function DocumentsPanel({ coopId }: { coopId: string }) {
  return (
    <div style={{ maxWidth: "760px" }}>
      <span className="eyebrow">Output Documents</span>
      <h1 style={{ marginBottom: "0.25rem" }}>Your Business Plan Package</h1>
      <p style={{ marginBottom: "1.5rem", color: "var(--color-text-secondary)" }}>
        Generated from your handbook answers. The more you fill in, the better each document gets.
      </p>

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
              href={`/documents/${doc.slug}?coopId=${coopId}`}
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

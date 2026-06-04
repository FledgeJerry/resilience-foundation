"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STAGES = ["IDEA", "KNOW_GROUND", "FIND_PEOPLE", "BUILD_STRUCTURE", "TEST_SMALL", "GET_SUPPORT", "SUSTAIN", "GROW"];
const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea", KNOW_GROUND: "Know Ground", FIND_PEOPLE: "Find People",
  BUILD_STRUCTURE: "Build Structure", TEST_SMALL: "Test Small",
  GET_SUPPORT: "Get Support", SUSTAIN: "Sustain", GROW: "Grow",
};

type ExtractedRecord = {
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  businessName: string | null;
  description: string | null;
  industry: string | null;
  formationType: string | null;
  naicsCode: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  website: string | null;
  laraId: string | null;
  formationDate: string | null;
  isDisabilityOwned: boolean;
  currentFte: number | null;
  plannedFte: number | null;
  annualRevenue: number | null;
  isMinorityOwned: boolean;
  isWomanOwned: boolean;
  isVeteranOwned: boolean;
  leapStatus: string | null;
  notes: string | null;
  stage: string;
  enabled: boolean;
};

const inp: React.CSSProperties = {
  width: "100%", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)",
  borderRadius: "6px", padding: "0.45rem 0.65rem", color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)", fontSize: "0.8rem", outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>{label}</label>
      {children}
    </div>
  );
}

function RecordCard({
  rec, index, onChange,
}: {
  rec: ExtractedRecord;
  index: number;
  onChange: (patch: Partial<ExtractedRecord>) => void;
}) {
  const set = (k: keyof ExtractedRecord, v: unknown) => onChange({ [k]: v });

  return (
    <div style={{ background: "var(--color-surface)", border: `1px solid ${rec.enabled ? "var(--color-border-strong)" : "var(--color-border)"}`, borderRadius: "10px", padding: "1.25rem", opacity: rec.enabled ? 1 : 0.45, display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Card header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-limestone)" }}>{rec.businessName || "(no business name)"}</p>
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{rec.ownerName || ""}{rec.ownerEmail ? ` · ${rec.ownerEmail}` : ""}</p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer", flexShrink: 0 }}>
          <input type="checkbox" checked={rec.enabled} onChange={e => set("enabled", e.target.checked)} />
          Import this record
        </label>
      </div>

      {/* Owner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.65rem" }}>
        <Field label="Business name"><input style={inp} value={rec.businessName ?? ""} onChange={e => set("businessName", e.target.value)} /></Field>
        <Field label="Owner name"><input style={inp} value={rec.ownerName ?? ""} onChange={e => set("ownerName", e.target.value)} /></Field>
        <Field label="Owner email"><input style={inp} type="email" value={rec.ownerEmail ?? ""} onChange={e => set("ownerEmail", e.target.value)} /></Field>
        <Field label="Owner phone"><input style={inp} value={rec.ownerPhone ?? ""} onChange={e => set("ownerPhone", e.target.value)} /></Field>
        <Field label="Industry"><input style={inp} value={rec.industry ?? ""} onChange={e => set("industry", e.target.value)} /></Field>
        <Field label="Formation type"><input style={inp} value={rec.formationType ?? ""} onChange={e => set("formationType", e.target.value)} placeholder="LLC, Sole Prop…" /></Field>
        <Field label="LARA ID"><input style={inp} value={rec.laraId ?? ""} onChange={e => set("laraId", e.target.value)} /></Field>
        <Field label="Formation date"><input style={inp} type="date" value={rec.formationDate ?? ""} onChange={e => set("formationDate", e.target.value)} /></Field>
        <Field label="Street"><input style={inp} value={rec.street ?? ""} onChange={e => set("street", e.target.value)} placeholder="123 Main St" /></Field>
        <Field label="City"><input style={inp} value={rec.city ?? ""} onChange={e => set("city", e.target.value)} /></Field>
        <Field label="State"><input style={inp} value={rec.state ?? ""} onChange={e => set("state", e.target.value)} /></Field>
        <Field label="Zip"><input style={inp} value={rec.zip ?? ""} onChange={e => set("zip", e.target.value)} /></Field>
        <Field label="County"><input style={inp} value={rec.county ?? ""} onChange={e => set("county", e.target.value)} /></Field>
        <Field label="Website"><input style={inp} value={rec.website ?? ""} onChange={e => set("website", e.target.value)} /></Field>
        <Field label="NAICS code"><input style={inp} value={rec.naicsCode ?? ""} onChange={e => set("naicsCode", e.target.value)} /></Field>
        <Field label="Stage">
          <select style={inp} value={rec.stage} onChange={e => set("stage", e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="LEAP status"><input style={inp} value={rec.leapStatus ?? ""} onChange={e => set("leapStatus", e.target.value)} /></Field>
        <Field label="Annual revenue ($)">
          <input style={inp} type="number" value={rec.annualRevenue ?? ""} onChange={e => set("annualRevenue", e.target.value ? parseFloat(e.target.value) : null)} />
        </Field>
        <Field label="FTEs now">
          <input style={inp} type="number" value={rec.currentFte ?? ""} onChange={e => set("currentFte", e.target.value ? parseInt(e.target.value) : null)} />
        </Field>
        <Field label="FTEs planned">
          <input style={inp} type="number" value={rec.plannedFte ?? ""} onChange={e => set("plannedFte", e.target.value ? parseInt(e.target.value) : null)} />
        </Field>
      </div>

      {/* Ownership + notes */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {([["isMinorityOwned", "Minority owned"], ["isWomanOwned", "Woman owned"], ["isVeteranOwned", "Veteran owned"]] as [keyof ExtractedRecord, string][]).map(([k, label]) => (
          <label key={k} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", cursor: "pointer" }}>
            <input type="checkbox" checked={!!rec[k]} onChange={e => set(k, e.target.checked)} />
            {label}
          </label>
        ))}
      </div>

      <Field label="Description / notes">
        <textarea style={{ ...inp, minHeight: "60px", resize: "vertical" }} value={rec.description ?? rec.notes ?? ""} onChange={e => set("description", e.target.value)} />
      </Field>
    </div>
  );
}

export default function CohortImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [records, setRecords] = useState<ExtractedRecord[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  if (status === "loading") return null;
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    router.push("/");
    return null;
  }

  async function extract() {
    setError("");
    setExtracting(true);
    setRecords([]);
    setDone(null);

    const form = new FormData();
    if (file) form.append("file", file);
    else form.append("text", text);

    const res = await fetch("/api/admin/cohort/extract", { method: "POST", body: form });
    setExtracting(false);

    const body = await res.text();
    if (!res.ok) {
      try { setError(JSON.parse(body).error ?? "Extraction failed"); }
      catch { setError(`Server error ${res.status}`); }
      return;
    }

    const data = JSON.parse(body);
    const extracted: ExtractedRecord[] = (data.entrepreneurs ?? []).map((r: Omit<ExtractedRecord, "stage" | "enabled">) => ({
      ...r,
      stage: "IDEA",
      enabled: true,
    }));
    setRecords(extracted);
  }

  function update(index: number, patch: Partial<ExtractedRecord>) {
    setRecords(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
  }

  async function importRecords() {
    setImporting(true);
    setError("");
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const rec of records.filter(r => r.enabled)) {
      if (!rec.ownerEmail || !rec.businessName) { skipped++; continue; }
      const res = await fetch("/api/admin/cohort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: rec.ownerName || "",
          ownerEmail: rec.ownerEmail,
          ownerPhone: rec.ownerPhone || "",
          businessName: rec.businessName,
          description: rec.description || "",
          industry: rec.industry || "",
          formationType: rec.formationType || "",
          naicsCode: rec.naicsCode || "",
          street: rec.street || "",
          city: rec.city || "",
          state: rec.state || "",
          zip: rec.zip || "",
          county: rec.county || "",
          website: rec.website || "",
          laraId: rec.laraId || "",
          formationDate: rec.formationDate || null,
          currentFte: rec.currentFte,
          plannedFte: rec.plannedFte,
          annualRevenue: rec.annualRevenue,
          isMinorityOwned: rec.isMinorityOwned,
          isWomanOwned: rec.isWomanOwned,
          isVeteranOwned: rec.isVeteranOwned,
          isDisabilityOwned: rec.isDisabilityOwned,
          leapStatus: rec.leapStatus || "",
          notes: rec.notes || "",
          stage: rec.stage,
        }),
      });
      if (res.status === 201) created++;
      else if (res.status === 200) updated++;
      else skipped++;
    }

    setImporting(false);
    setDone({ created, updated, skipped });
  }

  const enabledCount = records.filter(r => r.enabled).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "860px" }}>

      {/* Header */}
      <div>
        <span className="eyebrow">Administration · Cohort</span>
        <h1>Import Entrepreneurs</h1>
        <p style={{ marginTop: "0.25rem", color: "var(--color-text-muted)" }}>Upload a PDF or paste text — Gemini extracts the data, you review before importing.</p>
      </div>
      <Link href="/admin/cohort" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", alignSelf: "flex-start" }}>← Back to cohort</Link>

      {/* Input */}
      {records.length === 0 && !done && (
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Field label="Upload PDF or text file">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.csv"
              style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
              onChange={e => { setFile(e.target.files?.[0] ?? null); setText(""); }}
            />
          </Field>

          {!file && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>or paste text</span>
                <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste an application, intake form, survey response, or any text containing entrepreneur details…"
                rows={12}
                style={{ ...inp, resize: "vertical", fontFamily: "monospace", fontSize: "0.78rem" }}
              />
            </>
          )}

          {error && <p style={{ color: "#e07070", fontSize: "0.85rem" }}>{error}</p>}

          <div>
            <button
              className="btn btn--primary"
              onClick={extract}
              disabled={extracting || (!text.trim() && !file)}
            >
              {extracting ? "Extracting…" : "Extract with AI"}
            </button>
          </div>
        </div>
      )}

      {/* Extracting */}
      {extracting && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Reading document and extracting entrepreneur data…</p>
      )}

      {/* Review */}
      {records.length > 0 && !done && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              {records.length} record{records.length !== 1 ? "s" : ""} extracted — {enabledCount} selected for import
            </p>
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => { setRecords([]); setFile(null); setText(""); setError(""); }}>
              Start over
            </button>
          </div>

          {records.map((rec, i) => (
            <RecordCard key={i} rec={rec} index={i} onChange={patch => update(i, patch)} />
          ))}

          {error && <p style={{ color: "#e07070", fontSize: "0.85rem" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", paddingTop: "0.5rem" }}>
            <button
              className="btn btn--primary"
              onClick={importRecords}
              disabled={importing || enabledCount === 0}
            >
              {importing ? "Importing…" : `Import ${enabledCount} entrepreneur${enabledCount !== 1 ? "s" : ""}`}
            </button>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>Existing email matches are merged, not duplicated.</p>
          </div>
        </>
      )}

      {/* Success */}
      {done && (
        <div style={{ background: "rgba(74,155,142,0.1)", border: "1px solid var(--color-teal-accent)", borderRadius: "10px", padding: "2rem", textAlign: "center" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-teal-accent)", marginBottom: "0.5rem" }}>
            {done.created} created{done.updated > 0 ? `, ${done.updated} updated` : ""}
          </p>
          {done.skipped > 0 && <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>{done.skipped} skipped (missing email or business name)</p>}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link href="/admin/cohort" className="btn btn--primary">View cohort →</Link>
            <button className="btn btn--ghost" style={{ fontSize: "0.85rem" }} onClick={() => { setDone(null); setRecords([]); setFile(null); setText(""); }}>
              Import another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = ["IDEA", "KNOW_GROUND", "FIND_PEOPLE", "BUILD_STRUCTURE", "TEST_SMALL", "GET_SUPPORT", "SUSTAIN", "GROW"];
const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea", KNOW_GROUND: "Know Ground", FIND_PEOPLE: "Find People",
  BUILD_STRUCTURE: "Build Structure", TEST_SMALL: "Test Small",
  GET_SUPPORT: "Get Support", SUSTAIN: "Sustain", GROW: "Grow",
};
const CONTACT_TYPE_LABELS: Record<string, string> = {
  LEAD: "Lead", CUSTOMER: "Customer", ADVISOR: "Advisor",
  PARTNER: "Partner", INVESTOR: "Investor", TEAM: "Team", OTHER: "Other",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Owner = { id: string; name: string | null; email: string; phone: string | null };
type Contact = { id: string; type: string; name: string; email: string | null; phone: string | null; company: string | null; notes: string | null };
type Entry = {
  id: string; name: string; stage: string; industry: string | null;
  city: string | null; state: string | null; county: string | null;
  website: string | null; formationType: string | null; naicsCode: string | null;
  currentFte: number | null; plannedFte: number | null; annualRevenue: number | null;
  isMinorityOwned: boolean; isWomanOwned: boolean; isVeteranOwned: boolean;
  leapStatus: string | null; leapSubmittedAt: string | null; notes: string | null;
  members: { user: Owner }[];
  contacts?: Contact[];
  _count: { contacts: number; deals: number; planEntries: number };
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)",
  borderRadius: "6px", padding: "0.55rem 0.75rem", color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)", fontSize: "0.875rem", outline: "none",
};
const inpSm: React.CSSProperties = { ...inp, padding: "0.4rem 0.6rem", fontSize: "0.8rem" };

// ─── Sub-components ───────────────────────────────────────────────────────────

function OwnershipBadges({ entry }: { entry: Entry }) {
  const badges = [
    entry.isMinorityOwned && "Minority",
    entry.isWomanOwned && "Woman",
    entry.isVeteranOwned && "Veteran",
  ].filter(Boolean) as string[];
  if (!badges.length) return null;
  return (
    <span style={{ display: "inline-flex", gap: "0.25rem", flexWrap: "wrap" }}>
      {badges.map((b) => (
        <span key={b} style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", background: "rgba(74,155,142,0.15)", color: "var(--color-teal-accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{b}</span>
      ))}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
}

// ─── New Entrepreneur Form ────────────────────────────────────────────────────

function NewEntrepreneurForm({ onCreated, onCancel }: { onCreated: (e: Entry) => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    ownerName: "", ownerEmail: "", ownerPhone: "", businessName: "",
    industry: "", city: "", state: "", county: "", stage: "IDEA",
    leapStatus: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.ownerEmail || !form.businessName) { setError("Email and business name are required"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/cohort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
    onCreated(await res.json());
  }

  return (
    <form onSubmit={submit} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "10px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "1rem" }}>New Entrepreneur</h3>
        <button type="button" className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={onCancel}>Cancel</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
        <Field label="Business name *"><input style={inp} value={form.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Acme LLC" required /></Field>
        <Field label="Owner email *"><input style={inp} type="email" value={form.ownerEmail} onChange={e => set("ownerEmail", e.target.value)} placeholder="founder@example.com" required /></Field>
        <Field label="Owner name"><input style={inp} value={form.ownerName} onChange={e => set("ownerName", e.target.value)} placeholder="First Last" /></Field>
        <Field label="Phone"><input style={inp} value={form.ownerPhone} onChange={e => set("ownerPhone", e.target.value)} placeholder="(517) 555-1234" /></Field>
        <Field label="Industry"><input style={inp} value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="Food/Beverage" /></Field>
        <Field label="City"><input style={inp} value={form.city} onChange={e => set("city", e.target.value)} placeholder="Lansing" /></Field>
        <Field label="County"><input style={inp} value={form.county} onChange={e => set("county", e.target.value)} placeholder="Ingham" /></Field>
        <Field label="Stage">
          <select style={inp} value={form.stage} onChange={e => set("stage", e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="LEAP Status"><input style={inp} value={form.leapStatus} onChange={e => set("leapStatus", e.target.value)} placeholder="Connected" /></Field>
      </div>
      <Field label="Notes"><textarea style={{ ...inp, minHeight: "60px", resize: "vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field>
      {error && <p style={{ color: "#e07070", fontSize: "0.85rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Creating…" : "Create entrepreneur"}</button>
      </div>
    </form>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({ entry: initial, onClose, onSaved, onDeleted }: {
  entry: Entry; onClose: () => void;
  onSaved: (updated: Entry) => void; onDeleted: (id: string) => void;
}) {
  const [entry, setEntry] = useState<Entry>(initial);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [tab, setTab] = useState<"details" | "contacts">("details");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load full details (with contacts) on open
  useEffect(() => {
    fetch(`/api/admin/cohort/${initial.id}`)
      .then(r => r.json())
      .then(data => {
        setEntry(data);
        setContacts(data.contacts ?? []);
      });
  }, [initial.id]);

  const owner = entry.members[0]?.user;
  const [ownerName, setOwnerName] = useState(owner?.name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(owner?.phone ?? "");

  // Sync owner fields when entry loads
  useEffect(() => {
    const o = entry.members[0]?.user;
    if (o) { setOwnerName(o.name ?? ""); setOwnerPhone(o.phone ?? ""); }
  }, [entry.members]);

  const set = (k: keyof Entry, v: unknown) => setEntry(e => ({ ...e, [k]: v }));

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/cohort/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: entry.name,
        stage: entry.stage,
        industry: entry.industry,
        city: entry.city,
        state: entry.state,
        county: entry.county,
        website: entry.website,
        formationType: entry.formationType,
        naicsCode: entry.naicsCode,
        currentFte: entry.currentFte,
        plannedFte: entry.plannedFte,
        annualRevenue: entry.annualRevenue,
        isMinorityOwned: entry.isMinorityOwned,
        isWomanOwned: entry.isWomanOwned,
        isVeteranOwned: entry.isVeteranOwned,
        leapStatus: entry.leapStatus,
        notes: entry.notes,
        ownerName,
        ownerPhone,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved({ ...entry, ...updated, members: [{ user: { ...owner, name: ownerName, phone: ownerPhone } as Owner }] });
    }
  }

  async function deleteEntry() {
    setDeleting(true);
    await fetch(`/api/admin/cohort/${entry.id}`, { method: "DELETE" });
    onDeleted(entry.id);
  }

  const tabBtn = (t: typeof tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600, border: "none", cursor: "pointer", borderBottom: `2px solid ${tab === t ? "var(--color-dome-gold)" : "transparent"}`, background: "transparent", color: tab === t ? "var(--color-dome-gold)" : "var(--color-text-muted)" }}
    >
      {label}{count !== undefined ? ` (${count})` : ""}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} />

      {/* Drawer */}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(540px, 100vw)", background: "var(--color-surface-raised)", borderLeft: "1px solid var(--color-border-strong)", zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--color-surface-raised)", zIndex: 1 }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>{entry.name}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--color-text-muted)", padding: "0.25rem 0.5rem" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid var(--color-border)", padding: "0 1rem", display: "flex", gap: "0.25rem" }}>
          {tabBtn("details", "Details")}
          {tabBtn("contacts", "Contacts", contacts?.length ?? entry._count.contacts)}
        </div>

        {tab === "details" && (
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1 }}>

            {/* Owner */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Entrepreneur</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <Field label="Name"><input style={inpSm} value={ownerName} onChange={e => setOwnerName(e.target.value)} /></Field>
                <Field label="Email"><input style={{ ...inpSm, color: "var(--color-text-muted)" }} value={owner?.email ?? ""} readOnly /></Field>
                <Field label="Phone"><input style={inpSm} value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} /></Field>
              </div>
            </div>

            {/* Business info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <Field label="Business name"><input style={inpSm} value={entry.name} onChange={e => set("name", e.target.value)} /></Field>
              <Field label="Stage">
                <select style={inpSm} value={entry.stage} onChange={e => set("stage", e.target.value)}>
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </Field>
              <Field label="Industry"><input style={inpSm} value={entry.industry ?? ""} onChange={e => set("industry", e.target.value)} /></Field>
              <Field label="Formation type"><input style={inpSm} value={entry.formationType ?? ""} onChange={e => set("formationType", e.target.value)} placeholder="LLC, Sole Prop…" /></Field>
              <Field label="City"><input style={inpSm} value={entry.city ?? ""} onChange={e => set("city", e.target.value)} /></Field>
              <Field label="State"><input style={inpSm} value={entry.state ?? ""} onChange={e => set("state", e.target.value)} /></Field>
              <Field label="County"><input style={inpSm} value={entry.county ?? ""} onChange={e => set("county", e.target.value)} /></Field>
              <Field label="Website"><input style={inpSm} value={entry.website ?? ""} onChange={e => set("website", e.target.value)} /></Field>
              <Field label="NAICS code"><input style={inpSm} value={entry.naicsCode ?? ""} onChange={e => set("naicsCode", e.target.value)} /></Field>
              <Field label="LEAP status"><input style={inpSm} value={entry.leapStatus ?? ""} onChange={e => set("leapStatus", e.target.value)} /></Field>
              <Field label="Revenue (annual $)">
                <input style={inpSm} type="number" value={entry.annualRevenue ?? ""} onChange={e => set("annualRevenue", e.target.value ? parseFloat(e.target.value) : null)} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <Field label="FTEs now"><input style={inpSm} type="number" value={entry.currentFte ?? ""} onChange={e => set("currentFte", e.target.value ? parseInt(e.target.value) : null)} /></Field>
                <Field label="FTEs planned"><input style={inpSm} type="number" value={entry.plannedFte ?? ""} onChange={e => set("plannedFte", e.target.value ? parseInt(e.target.value) : null)} /></Field>
              </div>
            </div>

            {/* Ownership flags */}
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              {([["isMinorityOwned", "Minority owned"], ["isWomanOwned", "Woman owned"], ["isVeteranOwned", "Veteran owned"]] as [keyof Entry, string][]).map(([k, label]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!entry[k]} onChange={e => set(k, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>

            {/* Notes */}
            <Field label="Notes">
              <textarea style={{ ...inpSm, width: "100%", minHeight: "80px", resize: "vertical" }} value={entry.notes ?? ""} onChange={e => set("notes", e.target.value)} />
            </Field>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", paddingTop: "0.5rem" }}>
              <button className="btn btn--primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
              </button>
              {!confirmDelete ? (
                <button className="btn btn--ghost" style={{ fontSize: "0.8rem", color: "#e07070" }} onClick={() => setConfirmDelete(true)}>Delete</button>
              ) : (
                <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "#e07070" }}>Delete this entrepreneur?</span>
                  <button className="btn btn--ghost" style={{ fontSize: "0.8rem", color: "#e07070" }} onClick={deleteEntry} disabled={deleting}>{deleting ? "Deleting…" : "Yes, delete"}</button>
                  <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setConfirmDelete(false)}>Cancel</button>
                </span>
              )}
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <div style={{ padding: "1.5rem", flex: 1 }}>
            {contacts === null ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Loading…</p>
            ) : contacts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                <p style={{ marginBottom: "0.5rem" }}>No contacts yet.</p>
                <p style={{ fontSize: "0.8rem" }}>Contacts are added by the entrepreneur in their Journey workspace, or you can add them directly in the Journey admin.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {contacts.map(c => (
                  <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.9rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <p style={{ fontWeight: 600, color: "var(--color-limestone)", fontSize: "0.9rem" }}>{c.name}</p>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", background: "var(--color-surface-raised)", color: "var(--color-text-muted)", letterSpacing: "0.07em", textTransform: "uppercase", flexShrink: 0 }}>
                        {CONTACT_TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </div>
                    {c.company && <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "0.2rem" }}>{c.company}</p>}
                    {c.email && <p style={{ fontSize: "0.78rem" }}>{c.email}</p>}
                    {c.phone && <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{c.phone}</p>}
                    {c.notes && <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.4rem", fontStyle: "italic" }}>{c.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Stats Panel ─────────────────────────────────────────────────────────────

type CohortStats = {
  total: number;
  demographics: { minority: number; woman: number; veteran: number; anyDemographic: number };
  byStage: { stage: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  byCounty: { county: string; count: number }[];
  byLeapStatus: { status: string; count: number }[];
  byFormationType: { type: string; count: number }[];
  byQuarter: { quarter: string; count: number }[];
  fte: { totalCurrent: number; totalPlanned: number; withCurrentFte: number; withPlannedFte: number };
  revenue: { withRevenue: number; avg: number; median: number; buckets: { label: string; count: number }[] };
};

function Bar({ value, max, color = "var(--color-dome-gold)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, background: "var(--color-surface)", borderRadius: "3px", height: "8px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.3s" }} />
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", minWidth: "160px", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <Bar value={value} max={max} color={color} />
      <span style={{ fontSize: "0.8rem", fontWeight: 600, minWidth: "28px", textAlign: "right", color: "var(--color-limestone)" }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "10px", padding: "1rem 1.25rem" }}>
      <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--color-limestone)", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>{label}</p>
      {sub && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>{sub}</p>}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", margin: "0 0 0.75rem" }}>{children}</h3>;
}

function StatsPanel({ total }: { total: number }) {
  const [stats, setStats] = useState<CohortStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/cohort/stats").then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <div style={{ padding: "3rem", color: "var(--color-text-muted)" }}>Loading stats…</div>;

  const { demographics, byStage, byIndustry, byCounty, byLeapStatus, byFormationType, byQuarter, fte, revenue } = stats;
  const STAGE_ORDER = ["IDEA", "KNOW_GROUND", "FIND_PEOPLE", "BUILD_STRUCTURE", "TEST_SMALL", "GET_SUPPORT", "SUSTAIN", "GROW"];
  const stagesSorted = STAGE_ORDER.map(s => byStage.find(b => b.stage === s) ?? { stage: s, count: 0 });
  const maxStage = Math.max(...stagesSorted.map(s => s.count), 1);
  const maxIndustry = Math.max(...byIndustry.map(i => i.count), 1);
  const maxCounty = Math.max(...byCounty.map(c => c.count), 1);
  const maxLeap = Math.max(...byLeapStatus.map(l => l.count), 1);
  const maxForm = Math.max(...byFormationType.map(f => f.count), 1);
  const maxQuarter = Math.max(...byQuarter.map(q => q.count), 1);
  const maxRevBucket = Math.max(...revenue.buckets.map(b => b.count), 1);

  const demoPct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Top-line KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
        <StatCard label="Entrepreneurs" value={total} />
        <StatCard label="SEDI-owned" value={demoPct(demographics.anyDemographic)} sub={`${demographics.anyDemographic} of ${total}`} />
        <StatCard label="Jobs (current)" value={fte.totalCurrent.toLocaleString()} sub={`from ${fte.withCurrentFte} businesses`} />
        <StatCard label="Jobs (planned)" value={fte.totalPlanned.toLocaleString()} sub={`from ${fte.withPlannedFte} businesses`} />
        <StatCard label="Avg revenue" value={revenue.withRevenue ? `$${(revenue.avg / 1000).toFixed(0)}K` : "—"} sub={`${revenue.withRevenue} reported`} />
        <StatCard label="Median revenue" value={revenue.withRevenue ? `$${(revenue.median / 1000).toFixed(0)}K` : "—"} />
      </div>

      {/* Demographics */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <SectionHead>Ownership demographics</SectionHead>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          {([
            ["Minority-owned", demographics.minority, "var(--color-teal-accent)"],
            ["Woman-owned", demographics.woman, "var(--color-river-blue)"],
            ["Veteran-owned", demographics.veteran, "var(--color-dome-gold)"],
          ] as [string, number, string][]).map(([label, count, color]) => (
            <div key={label} style={{ textAlign: "center", padding: "0.75rem", background: "var(--color-surface)", borderRadius: "8px" }}>
              <p style={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1 }}>{demoPct(count)}</p>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>{label}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{count} of {total}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* Pipeline stage */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <SectionHead>Pipeline stage</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {stagesSorted.map(({ stage, count }) => (
              <BarRow key={stage} label={STAGE_LABELS[stage]} value={count} max={maxStage} color="var(--color-dome-gold)" />
            ))}
          </div>
        </div>

        {/* LEAP status */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <SectionHead>LEAP status</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {byLeapStatus.map(({ status, count }) => (
              <BarRow key={status} label={status} value={count} max={maxLeap} color="var(--color-river-blue)" />
            ))}
          </div>
        </div>

        {/* Formation type */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <SectionHead>Business formation</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {byFormationType.map(({ type, count }) => (
              <BarRow key={type} label={type} value={count} max={maxForm} color="var(--color-teal-accent)" />
            ))}
          </div>
        </div>

        {/* Revenue buckets */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <SectionHead>Annual revenue range</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {revenue.buckets.map(({ label, count }) => (
              <BarRow key={label} label={label} value={count} max={maxRevBucket} color="var(--color-dome-gold)" />
            ))}
            <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>{total - revenue.withRevenue} businesses have no revenue reported</p>
          </div>
        </div>

      </div>

      {/* Industry */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <SectionHead>Top industries</SectionHead>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {byIndustry.map(({ industry, count }) => (
            <BarRow key={industry} label={industry} value={count} max={maxIndustry} color="var(--color-dome-gold)" />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* County */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <SectionHead>County</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {byCounty.map(({ county, count }) => (
              <BarRow key={county} label={county} value={count} max={maxCounty} color="var(--color-teal-accent)" />
            ))}
          </div>
        </div>

        {/* Submissions by quarter */}
        {byQuarter.length > 0 && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <SectionHead>Submissions by quarter</SectionHead>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {byQuarter.map(({ quarter, count }) => (
                <BarRow key={quarter} label={quarter} value={count} max={maxQuarter} color="var(--color-river-blue)" />
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CohortPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "stats">("list");
  const [q, setQ] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [stageSaving, setStageSaving] = useState<Record<string, boolean>>({});
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const load = useCallback((query = q, stage = filterStage, industry = filterIndustry) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (stage) params.set("stage", stage);
    if (industry) params.set("industry", industry);
    return fetch(`/api/admin/cohort?${params}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); });
  }, [q, filterStage, filterIndustry]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [session, status, router, load]);

  async function quickStage(e: React.MouseEvent, id: string, stage: string) {
    e.stopPropagation();
    setStageSaving((s) => ({ ...s, [id]: true }));
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, stage } : e));
    await fetch("/api/admin/cohort", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    });
    setStageSaving((s) => ({ ...s, [id]: false }));
  }

  const industries = Array.from(new Set(entries.map((e) => e.industry).filter(Boolean))).sort() as string[];

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function sortVal(e: Entry): string | number | null {
    switch (sortCol) {
      case "name":     return e.name.toLowerCase();
      case "owner":    return (e.members[0]?.user.name ?? "").toLowerCase();
      case "email":    return (e.members[0]?.user.email ?? "").toLowerCase();
      case "stage":    return STAGES.indexOf(e.stage);
      case "industry": return (e.industry ?? "").toLowerCase();
      case "county":   return (e.county ?? e.city ?? "").toLowerCase();
      case "revenue":  return e.annualRevenue ?? -1;
      case "fte":      return e.currentFte ?? -1;
      case "leap":     return (e.leapStatus ?? "").toLowerCase();
      default:         return null;
    }
  }

  const sortedEntries = [...entries].sort((a, b) => {
    const av = sortVal(a), bv = sortVal(b);
    if (av === null || bv === null) return 0;
    const cmp = typeof av === "number" ? av - (bv as number) : (av as string).localeCompare(bv as string);
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (status === "loading" || loading) return <div style={{ padding: "3rem", color: "var(--color-text-muted)" }}>Loading cohort…</div>;

  const stageCount = STAGES.reduce((acc, s) => { acc[s] = entries.filter((e) => e.stage === s).length; return acc; }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Entrepreneur Cohort</h1>
          <p style={{ marginTop: "0.25rem" }}>{entries.length} entrepreneurs</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="btn btn--primary" onClick={() => setShowNew(v => !v)}>+ New Entrepreneur</button>
          <Link href="/admin" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>← Back to admin</Link>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--color-border)" }}>
        {(["list", "stats"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, border: "none", cursor: "pointer", borderBottom: `2px solid ${view === v ? "var(--color-dome-gold)" : "transparent"}`, background: "transparent", color: view === v ? "var(--color-dome-gold)" : "var(--color-text-muted)", textTransform: "capitalize" }}>
            {v === "list" ? "Roster" : "Stats"}
          </button>
        ))}
      </div>

      {view === "stats" && <StatsPanel total={entries.length} />}
      {view === "list" && <>

      {/* New entrepreneur form */}
      {showNew && (
        <NewEntrepreneurForm
          onCreated={(e) => { setEntries(prev => [e, ...prev]); setShowNew(false); setSelected(e); }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {/* Stage pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "0.5rem" }}>
        {STAGES.map((s) => (
          <button key={s}
            onClick={() => { const next = filterStage === s ? "" : s; setFilterStage(next); load(q, next, filterIndustry); }}
            style={{ background: filterStage === s ? "var(--color-dome-gold)" : "var(--color-surface)", border: `1px solid ${filterStage === s ? "var(--color-dome-gold)" : "var(--color-border-strong)"}`, borderRadius: "8px", padding: "0.6rem 0.5rem", cursor: "pointer", textAlign: "center" }}
          >
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: filterStage === s ? "var(--color-midnight-steel)" : "var(--color-limestone)", lineHeight: 1 }}>{stageCount[s] ?? 0}</p>
            <p style={{ fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: filterStage === s ? "var(--color-midnight-steel)" : "var(--color-text-muted)", marginTop: "0.25rem" }}>{STAGE_LABELS[s]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search name, email, business…" value={q}
          onChange={(e) => { setQ(e.target.value); load(e.target.value, filterStage, filterIndustry); }}
          style={{ ...inp, minWidth: "260px", width: "auto" }}
        />
        <select value={filterIndustry}
          onChange={(e) => { setFilterIndustry(e.target.value); load(q, filterStage, e.target.value); }}
          style={{ ...inp, width: "auto" }}
        >
          <option value="">All industries</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        {(q || filterStage || filterIndustry) && (
          <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }}
            onClick={() => { setQ(""); setFilterStage(""); setFilterIndustry(""); load("", "", ""); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", overflowX: "auto" }}>
        <table className="ll-table" style={{ minWidth: "860px" }}>
          <thead>
            <tr>
              {([
                ["name",     "Business / Entrepreneur"],
                ["email",    "Contact"],
                ["stage",    "Stage"],
                ["industry", "Industry"],
                ["county",   "Location"],
                ["revenue",  "Revenue"],
                ["fte",      "FTEs"],
                ["leap",     "LEAP"],
              ] as [string, string][]).map(([col, label]) => (
                <th key={col} onClick={() => toggleSort(col)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                  {label}{" "}
                  <span style={{ fontSize: "0.65rem", color: sortCol === col ? "var(--color-dome-gold)" : "var(--color-text-muted)", opacity: sortCol === col ? 1 : 0.5 }}>
                    {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>No entries found</td></tr>
            )}
            {sortedEntries.map((e) => {
              const owner = e.members[0]?.user;
              return (
                <tr key={e.id} onClick={() => setSelected(e)} style={{ cursor: "pointer" }}>
                  <td>
                    <p style={{ fontWeight: 600, color: "var(--color-limestone)", fontSize: "0.9rem" }}>{e.name}</p>
                    {owner && <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{owner.name ?? ""}</p>}
                    <OwnershipBadges entry={e} />
                  </td>
                  <td>
                    {owner && (
                      <>
                        <p style={{ fontSize: "0.78rem" }}>{owner.email}</p>
                        {owner.phone && <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{owner.phone}</p>}
                      </>
                    )}
                  </td>
                  <td onClick={ev => ev.stopPropagation()}>
                    <select value={e.stage} onChange={ev => quickStage(ev as unknown as React.MouseEvent, e.id, ev.target.value)}
                      style={{ ...inpSm, width: "auto", cursor: "pointer" }}>
                      {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                    </select>
                    {stageSaving[e.id] && <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", display: "block" }}>Saving…</span>}
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>{e.industry ?? "—"}</td>
                  <td style={{ fontSize: "0.78rem" }}>
                    {e.county && <p>{e.county} Co.</p>}
                    {(e.city || e.state) && <p style={{ color: "var(--color-text-muted)" }}>{[e.city, e.state].filter(Boolean).join(", ")}</p>}
                    {!e.county && !e.city && !e.state && "—"}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {e.annualRevenue != null ? `$${e.annualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {e.currentFte != null && <span>{e.currentFte} now</span>}
                    {e.plannedFte != null && <span style={{ color: "var(--color-text-muted)", display: "block" }}>{e.plannedFte} planned</span>}
                    {e.currentFte == null && e.plannedFte == null && "—"}
                  </td>
                  <td>
                    {e.leapStatus && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: "3px", letterSpacing: "0.06em", textTransform: "uppercase",
                        background: e.leapStatus === "Connected" ? "rgba(46,109,164,0.15)" : e.leapStatus === "Not Approved" ? "rgba(192,57,43,0.15)" : "rgba(232,200,74,0.15)",
                        color: e.leapStatus === "Connected" ? "var(--color-river-blue)" : e.leapStatus === "Not Approved" ? "#e07070" : "var(--color-dome-gold)",
                      }}>
                        {e.leapStatus}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Click any row to edit. Stage dropdown saves immediately. Imported entrepreneurs can claim their account by registering with their email.
      </p>

      </>}

      {/* Edit drawer (outside list guard so it stays mounted on tab switch) */}
      {selected && (
        <EditDrawer
          entry={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setEntries(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
            setSelected(null);
          }}
          onDeleted={(id) => {
            setEntries(prev => prev.filter(e => e.id !== id));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

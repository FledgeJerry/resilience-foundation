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

const FUNDING_TYPES = ["GRANT", "LOAN", "PRIZE", "INVESTMENT", "OTHER"] as const;
type FundingType = typeof FUNDING_TYPES[number];
const FUNDING_LABELS: Record<FundingType, string> = { GRANT: "Grant", LOAN: "Loan", PRIZE: "Prize", INVESTMENT: "Investment", OTHER: "Other" };
const FUNDING_COLORS: Record<FundingType, string> = { GRANT: "#4a9b8e", LOAN: "#7b8ea8", PRIZE: "#c9a227", INVESTMENT: "#8b6cb3", OTHER: "#888" };

type FundingRecord = { id: string; type: FundingType; amount: number | null; source: string; receivedAt: string | null; notes: string | null };
type ConnectionRecord = { id: string; resource: string; description: string | null; connectedAt: string | null; notes: string | null };
type HireRecord = { id: string; fteAdded: number; hiredAt: string | null; notes: string | null };

type Owner = { id: string; name: string | null; email: string; phone: string | null };
type Contact = { id: string; type: string; name: string; email: string | null; phone: string | null; company: string | null; notes: string | null };
type Entry = {
  id: string; name: string; stage: string; industry: string | null;
  street: string | null; city: string | null; state: string | null; zip: string | null; county: string | null;
  website: string | null; formationType: string | null; laraId: string | null; laraDate: string | null; formationDate: string | null; naicsCode: string | null;
  currentFte: number | null; plannedFte: number | null; annualRevenue: number | null;
  isMinorityOwned: boolean; isWomanOwned: boolean; isVeteranOwned: boolean; isDisabilityOwned: boolean;
  leapStatus: string | null; leapSubmittedAt: string | null; notes: string | null;
  cohortId: string | null;
  cohort: { id: string; name: string } | null;
  members: { user: Owner }[];
  contacts?: Contact[];
  _count: { contacts: number; deals: number; planEntries: number };
  trekHours: number;
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

// ─── Funding Tab ──────────────────────────────────────────────────────────────

const emptyFunding = () => ({ type: "GRANT" as FundingType, amount: "", source: "", receivedAt: "", notes: "" });

function FundingTab({ businessId, records, onRecordsChange }: {
  businessId: string;
  records: FundingRecord[] | null;
  onRecordsChange: (r: FundingRecord[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyFunding());
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyFunding());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const total = (records ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

  async function addRecord() {
    if (!form.source.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/cohort/${businessId}/funding`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: form.amount ? parseFloat(form.amount) : null }),
    });
    if (res.ok) {
      const rec = await res.json();
      onRecordsChange([rec, ...(records ?? [])]);
      setForm(emptyFunding());
      setAdding(false);
    }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/cohort/${businessId}/funding/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, amount: editForm.amount ? parseFloat(editForm.amount) : null }),
    });
    if (res.ok) {
      const updated = await res.json();
      onRecordsChange((records ?? []).map(r => r.id === id ? updated : r));
      setEditId(null);
    }
    setSaving(false);
  }

  async function deleteRecord(id: string) {
    setDeletingId(id);
    await fetch(`/api/admin/cohort/${businessId}/funding/${id}`, { method: "DELETE" });
    onRecordsChange((records ?? []).filter(r => r.id !== id));
    setDeletingId(null);
  }

  const fmtAmt = (n: number | null) => n != null ? `$${n.toLocaleString()}` : "—";
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  if (records === null) return <div style={{ padding: "2rem", color: "var(--color-text-muted)" }}>Loading…</div>;

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Summary bar */}
      {records.length > 0 && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "0.9rem 1.1rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--color-dome-gold)", lineHeight: 1 }}>${total.toLocaleString()}</p>
            <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>Total funding</p>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {FUNDING_TYPES.map(t => {
              const recs = records.filter(r => r.type === t);
              if (!recs.length) return null;
              const sum = recs.reduce((s, r) => s + (r.amount ?? 0), 0);
              return (
                <span key={t} style={{ fontSize: "0.7rem", padding: "2px 7px", borderRadius: "4px", background: `${FUNDING_COLORS[t]}22`, color: FUNDING_COLORS[t], fontWeight: 600 }}>
                  {FUNDING_LABELS[t]}: ${sum.toLocaleString()}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Add button / form */}
      {!adding ? (
        <button className="btn btn--secondary" style={{ alignSelf: "flex-start", fontSize: "0.8rem" }} onClick={() => setAdding(true)}>+ Add funding record</button>
      ) : (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>New funding record</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <Field label="Type">
              <select style={inpSm} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as FundingType }))}>
                {FUNDING_TYPES.map(t => <option key={t} value={t}>{FUNDING_LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label="Amount ($)">
              <input style={inpSm} type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Source / Funder">
              <input style={{ ...inpSm, gridColumn: "span 2" }} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="BAF, LEAP, MEDC…" />
            </Field>
            <Field label="Date received">
              <input style={inpSm} type="date" value={form.receivedAt} onChange={e => setForm(f => ({ ...f, receivedAt: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea style={{ ...inpSm, minHeight: "56px", resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Terms, conditions, program name…" />
          </Field>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={addRecord} disabled={saving || !form.source.trim()}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => { setAdding(false); setForm(emptyFunding()); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Records list */}
      {records.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No funding records yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {records.map(r => editId === r.id ? (
            <div key={r.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-dome-gold)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <Field label="Type">
                  <select style={inpSm} value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value as FundingType }))}>
                    {FUNDING_TYPES.map(t => <option key={t} value={t}>{FUNDING_LABELS[t]}</option>)}
                  </select>
                </Field>
                <Field label="Amount ($)">
                  <input style={inpSm} type="number" min="0" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
                </Field>
                <Field label="Source / Funder">
                  <input style={inpSm} value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} />
                </Field>
                <Field label="Date received">
                  <input style={inpSm} type="date" value={editForm.receivedAt} onChange={e => setEditForm(f => ({ ...f, receivedAt: e.target.value }))} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea style={{ ...inpSm, minHeight: "56px", resize: "vertical" }} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </Field>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={() => saveEdit(r.id)} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setEditId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={r.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-limestone)" }}>{fmtAmt(r.amount)}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: "3px", background: `${FUNDING_COLORS[r.type]}22`, color: FUNDING_COLORS[r.type], letterSpacing: "0.07em", textTransform: "uppercase" }}>{FUNDING_LABELS[r.type]}</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--color-limestone)", marginBottom: "0.1rem" }}>{r.source}</p>
                <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{fmtDate(r.receivedAt)}</p>
                {r.notes && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem", fontStyle: "italic" }}>{r.notes}</p>}
              </div>
              <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
                <button onClick={() => { setEditId(r.id); setEditForm({ type: r.type, amount: r.amount != null ? String(r.amount) : "", source: r.source, receivedAt: r.receivedAt ? r.receivedAt.slice(0, 10) : "", notes: r.notes ?? "" }); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-text-muted)", padding: "0.2rem 0.4rem" }}>Edit</button>
                <button onClick={() => deleteRecord(r.id)} disabled={deletingId === r.id} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#e07070", padding: "0.2rem 0.4rem" }}>{deletingId === r.id ? "…" : "Delete"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Connections Tab ─────────────────────────────────────────────────────────

function ConnectionsTab({ businessId, records, onRecordsChange }: {
  businessId: string;
  records: ConnectionRecord[] | null;
  onRecordsChange: (r: ConnectionRecord[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ resource: "", description: "", connectedAt: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ resource: "", description: "", connectedAt: "", notes: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  async function addRecord() {
    if (!form.resource.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/cohort/${businessId}/connections`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      onRecordsChange([await res.json(), ...(records ?? [])]);
      setForm({ resource: "", description: "", connectedAt: "", notes: "" });
      setAdding(false);
    }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/cohort/${businessId}/connections/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      onRecordsChange((records ?? []).map(r => r.id === id ? { ...r, ...updated } : r));
      setEditId(null);
    }
    setSaving(false);
  }

  async function deleteRecord(id: string) {
    setDeletingId(id);
    await fetch(`/api/admin/cohort/${businessId}/connections/${id}`, { method: "DELETE" });
    onRecordsChange((records ?? []).filter(r => r.id !== id));
    setDeletingId(null);
  }

  if (records === null) return <div style={{ padding: "2rem", color: "var(--color-text-muted)" }}>Loading…</div>;

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {!adding ? (
        <button className="btn btn--secondary" style={{ alignSelf: "flex-start", fontSize: "0.8rem" }} onClick={() => setAdding(true)}>+ Add connection</button>
      ) : (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>New connection</p>
          <Field label="Connected to (organization / resource / opportunity)">
            <input style={inpSm} value={form.resource} onChange={e => setForm(f => ({ ...f, resource: e.target.value }))} placeholder="Capital Area Startup Studio, Foster Swift, Vending Opportunity…" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <Field label="Description">
              <input style={inpSm} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was the connection?" />
            </Field>
            <Field label="Date">
              <input style={inpSm} type="date" value={form.connectedAt} onChange={e => setForm(f => ({ ...f, connectedAt: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea style={{ ...inpSm, minHeight: "52px", resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={addRecord} disabled={saving || !form.resource.trim()}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No connections recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {records.map(r => editId === r.id ? (
            <div key={r.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-dome-gold)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Field label="Connected to">
                <input style={inpSm} value={editForm.resource} onChange={e => setEditForm(f => ({ ...f, resource: e.target.value }))} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <Field label="Description">
                  <input style={inpSm} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </Field>
                <Field label="Date">
                  <input style={inpSm} type="date" value={editForm.connectedAt} onChange={e => setEditForm(f => ({ ...f, connectedAt: e.target.value }))} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea style={{ ...inpSm, minHeight: "52px", resize: "vertical" }} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </Field>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={() => saveEdit(r.id)} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setEditId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={r.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: "var(--color-limestone)", fontSize: "0.9rem", marginBottom: "0.15rem" }}>{r.resource}</p>
                {r.description && <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.1rem" }}>{r.description}</p>}
                <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{fmtDate(r.connectedAt)}</p>
                {r.notes && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem", fontStyle: "italic" }}>{r.notes}</p>}
              </div>
              <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
                <button onClick={() => { setEditId(r.id); setEditForm({ resource: r.resource, description: r.description ?? "", connectedAt: r.connectedAt ? r.connectedAt.slice(0, 10) : "", notes: r.notes ?? "" }); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-text-muted)", padding: "0.2rem 0.4rem" }}>Edit</button>
                <button onClick={() => deleteRecord(r.id)} disabled={deletingId === r.id} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#e07070", padding: "0.2rem 0.4rem" }}>{deletingId === r.id ? "…" : "Delete"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hires Tab ────────────────────────────────────────────────────────────────

function HiresTab({ businessId, records, onRecordsChange }: {
  businessId: string;
  records: HireRecord[] | null;
  onRecordsChange: (r: HireRecord[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fteAdded: "1", hiredAt: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalHired = (records ?? []).reduce((s, r) => s + r.fteAdded, 0);
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  async function addRecord() {
    const fte = parseInt(form.fteAdded, 10);
    if (!fte || fte < 1) return;
    setSaving(true);
    const res = await fetch(`/api/admin/cohort/${businessId}/hires`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      onRecordsChange([await res.json(), ...(records ?? [])]);
      setForm({ fteAdded: "1", hiredAt: "", notes: "" });
      setAdding(false);
    }
    setSaving(false);
  }

  async function deleteRecord(r: HireRecord) {
    setDeletingId(r.id);
    await fetch(`/api/admin/cohort/${businessId}/hires/${r.id}`, { method: "DELETE" });
    onRecordsChange((records ?? []).filter(x => x.id !== r.id));
    setDeletingId(null);
  }

  if (records === null) return <div style={{ padding: "2rem", color: "var(--color-text-muted)" }}>Loading…</div>;

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {records.length > 0 && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "0.9rem 1.1rem" }}>
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--color-teal-accent)", lineHeight: 1 }}>{totalHired}</p>
          <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>FTEs hired (recorded)</p>
        </div>
      )}

      {!adding ? (
        <button className="btn btn--secondary" style={{ alignSelf: "flex-start", fontSize: "0.8rem" }} onClick={() => setAdding(true)}>+ Record hire event</button>
      ) : (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>New hire event</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <Field label="FTEs hired">
              <input style={inpSm} type="number" min="1" value={form.fteAdded} onChange={e => setForm(f => ({ ...f, fteAdded: e.target.value }))} />
            </Field>
            <Field label="Date">
              <input style={inpSm} type="date" value={form.hiredAt} onChange={e => setForm(f => ({ ...f, hiredAt: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea style={{ ...inpSm, minHeight: "52px", resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Role, context, program-related…" />
          </Field>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={addRecord} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No hire events recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {records.map(r => (
            <div key={r.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.15rem" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-teal-accent)" }}>+{r.fteAdded}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>FTE{r.fteAdded !== 1 ? "s" : ""} hired</span>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{fmtDate(r.hiredAt)}</p>
                {r.notes && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem", fontStyle: "italic" }}>{r.notes}</p>}
              </div>
              <button onClick={() => deleteRecord(r)} disabled={deletingId === r.id} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#e07070", padding: "0.2rem 0.4rem", flexShrink: 0 }}>{deletingId === r.id ? "…" : "Delete"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Time Tab ─────────────────────────────────────────────────────────────────

type TimeRecord = { id: string; date: string; category: string; hours: number; staffMember: string; notes: string | null };

function dateToQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()} Q${q}`;
}

const TIME_CATEGORIES = ["One On One", "EJ Meetup", "99 Problems", "Data/Reporting", "Admin", "Other"];

function TimeTab({ businessId, records, onRecordsChange }: {
  businessId: string;
  records: TimeRecord[] | null;
  onRecordsChange: (r: TimeRecord[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", category: "One On One", hours: "1", staffMember: "Jerry", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalHours = (records ?? []).reduce((s, r) => s + r.hours, 0);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  async function addRecord() {
    if (!form.date || !form.hours) return;
    setSaving(true);
    const res = await fetch(`/api/admin/cohort/${businessId}/time`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      onRecordsChange([await res.json(), ...(records ?? [])]);
      setForm({ date: "", category: "One On One", hours: "1", staffMember: "Jerry", notes: "" });
      setAdding(false);
    }
    setSaving(false);
  }

  async function deleteRecord(r: TimeRecord) {
    setDeletingId(r.id);
    await fetch(`/api/admin/cohort/${businessId}/time/${r.id}`, { method: "DELETE" });
    onRecordsChange((records ?? []).filter(x => x.id !== r.id));
    setDeletingId(null);
  }

  if (records === null) return <div style={{ padding: "2rem", color: "var(--color-text-muted)" }}>Loading…</div>;

  const byQuarter = records.reduce<Record<string, number>>((acc, r) => {
    const q = dateToQuarter(r.date);
    acc[q] = (acc[q] ?? 0) + r.hours;
    return acc;
  }, {});

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {records.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "0.9rem 1.1rem", minWidth: "100px" }}>
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--color-dome-gold)", lineHeight: 1 }}>{totalHours.toLocaleString()}</p>
            <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>Total hours</p>
          </div>
          {Object.entries(byQuarter).sort(([a], [b]) => a.localeCompare(b)).map(([q, h]) => (
            <div key={q} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.9rem 1.1rem", minWidth: "90px" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-limestone)", lineHeight: 1 }}>{h}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>{q}</p>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <button className="btn btn--secondary" style={{ alignSelf: "flex-start", fontSize: "0.8rem" }} onClick={() => setAdding(true)}>+ Log session</button>
      ) : (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>New session</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <Field label="Date *"><input style={inpSm} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Hours *"><input style={inpSm} type="number" step="0.25" min="0.25" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} /></Field>
            <Field label="Category">
              <select style={inpSm} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {TIME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Staff"><input style={inpSm} value={form.staffMember} onChange={e => setForm(f => ({ ...f, staffMember: e.target.value }))} /></Field>
          </div>
          <Field label="Notes"><textarea style={{ ...inpSm, minHeight: "52px", resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={addRecord} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No sessions logged yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {records.map(r => (
            <div key={r.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-dome-gold)" }}>{r.hours}h</span>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-limestone)" }}>{r.category}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{r.staffMember}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{fmtDate(r.date)}</span>
                  <span style={{ fontSize: "0.65rem", padding: "1px 5px", borderRadius: "3px", background: "rgba(232,200,74,0.1)", color: "var(--color-dome-gold)" }}>{dateToQuarter(r.date)}</span>
                </div>
                {r.notes && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.25rem", fontStyle: "italic" }}>{r.notes}</p>}
              </div>
              <button onClick={() => deleteRecord(r)} disabled={deletingId === r.id} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#e07070", padding: "0.2rem 0.4rem", flexShrink: 0 }}>{deletingId === r.id ? "…" : "Delete"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({ entry: initial, onClose, onSaved, onDeleted }: {
  entry: Entry; onClose: () => void;
  onSaved: (updated: Entry) => void; onDeleted: (id: string) => void;
}) {
  const [entry, setEntry] = useState<Entry>(initial);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [funding, setFunding] = useState<FundingRecord[] | null>(null);
  const [connections, setConnections] = useState<ConnectionRecord[] | null>(null);
  const [hires, setHires] = useState<HireRecord[] | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeRecord[] | null>(null);
  const [tab, setTab] = useState<"details" | "contacts" | "funding" | "connections" | "hires" | "time">("details");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/cohorts").then(r => r.json()).then(setCohorts);
  }, []);

  // Load full details (with contacts) on open
  useEffect(() => {
    fetch(`/api/admin/cohort/${initial.id}`)
      .then(r => r.json())
      .then(data => {
        setEntry(data);
        setContacts(data.contacts ?? []);
      });
    fetch(`/api/admin/cohort/${initial.id}/funding`).then(r => r.json()).then(setFunding);
    fetch(`/api/admin/cohort/${initial.id}/connections`).then(r => r.json()).then(setConnections);
    fetch(`/api/admin/cohort/${initial.id}/hires`).then(r => r.json()).then(setHires);
    fetch(`/api/admin/cohort/${initial.id}/time`).then(r => r.json()).then(setTimeLogs);
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
        street: entry.street,
        zip: entry.zip,
        city: entry.city,
        state: entry.state,
        county: entry.county,
        website: entry.website,
        formationType: entry.formationType,
        laraId: entry.laraId,
        laraDate: entry.laraDate || null,
        naicsCode: entry.naicsCode,
        currentFte: entry.currentFte,
        plannedFte: entry.plannedFte,
        annualRevenue: entry.annualRevenue,
        formationDate: entry.formationDate || null,
        isMinorityOwned: entry.isMinorityOwned,
        isWomanOwned: entry.isWomanOwned,
        isVeteranOwned: entry.isVeteranOwned,
        isDisabilityOwned: entry.isDisabilityOwned,
        cohortId: entry.cohortId || null,
        leapStatus: entry.leapStatus,
        leapSubmittedAt: entry.leapSubmittedAt || null,
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
          {tabBtn("funding", "Funding", funding?.length)}
          {tabBtn("connections", "Connections", connections?.length)}
          {tabBtn("hires", "Hires", hires?.length)}
          {tabBtn("time", "Time", timeLogs?.length)}
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
              <Field label="LARA ID"><input style={inpSm} value={entry.laraId ?? ""} onChange={e => set("laraId", e.target.value)} placeholder="B12345678" /></Field>
              <Field label="LARA date"><input style={inpSm} type="date" value={entry.laraDate ? entry.laraDate.slice(0, 10) : ""} onChange={e => set("laraDate", e.target.value || null)} /></Field>
              <Field label="Formation date"><input style={inpSm} type="date" value={entry.formationDate ? entry.formationDate.slice(0, 10) : ""} onChange={e => set("formationDate", e.target.value || null)} /></Field>
              <Field label="Street"><input style={inpSm} value={entry.street ?? ""} onChange={e => set("street", e.target.value)} placeholder="123 Main St" /></Field>
              <Field label="Zip"><input style={inpSm} value={entry.zip ?? ""} onChange={e => set("zip", e.target.value)} placeholder="48912" /></Field>
              <Field label="City"><input style={inpSm} value={entry.city ?? ""} onChange={e => set("city", e.target.value)} /></Field>
              <Field label="State"><input style={inpSm} value={entry.state ?? ""} onChange={e => set("state", e.target.value)} /></Field>
              <Field label="County"><input style={inpSm} value={entry.county ?? ""} onChange={e => set("county", e.target.value)} /></Field>
              <Field label="Website"><input style={inpSm} value={entry.website ?? ""} onChange={e => set("website", e.target.value)} /></Field>
              <Field label="NAICS code"><input style={inpSm} value={entry.naicsCode ?? ""} onChange={e => set("naicsCode", e.target.value)} /></Field>
              <Field label="LEAP status"><input style={inpSm} value={entry.leapStatus ?? ""} onChange={e => set("leapStatus", e.target.value)} /></Field>
              <Field label="Cohort">
                <select style={inpSm} value={entry.cohortId ?? ""} onChange={e => set("cohortId", e.target.value || null)}>
                  <option value="">— none —</option>
                  {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Date connected"><input style={inpSm} type="date" value={entry.leapSubmittedAt ? entry.leapSubmittedAt.slice(0, 10) : ""} onChange={e => set("leapSubmittedAt", e.target.value || null)} /></Field>
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
              {([["isMinorityOwned", "Minority owned"], ["isWomanOwned", "Woman owned"], ["isVeteranOwned", "Veteran owned"], ["isDisabilityOwned", "Disability owned"]] as [keyof Entry, string][]).map(([k, label]) => (
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

        {tab === "funding" && (
          <FundingTab businessId={entry.id} records={funding} onRecordsChange={setFunding} />
        )}
        {tab === "connections" && (
          <ConnectionsTab businessId={entry.id} records={connections} onRecordsChange={setConnections} />
        )}
        {tab === "hires" && (
          <HiresTab businessId={entry.id} records={hires} onRecordsChange={setHires} />
        )}

        {tab === "time" && (
          <TimeTab businessId={entry.id} records={timeLogs} onRecordsChange={setTimeLogs} />
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
  byLaraYear: { year: string; count: number }[];
  withLaraDate: number;
  byQuarter: { quarter: string; count: number }[];
  fte: { totalCurrent: number; totalPlanned: number; withCurrentFte: number; withPlannedFte: number };
  revenue: { withRevenue: number; avg: number; median: number; buckets: { label: string; count: number }[] };
  funding: { total: number; count: number; byType: { type: string; total: number; count: number }[]; topSources: { source: string; total: number; count: number }[] };
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

  const { demographics, byStage, byIndustry, byCounty, byLeapStatus, byFormationType, byLaraYear, withLaraDate, byQuarter, fte, revenue, funding } = stats;
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
        <StatCard label="Total funding" value={funding?.total ? `$${(funding.total / 1000).toFixed(0)}K` : "—"} sub={funding?.count ? `${funding.count} records` : "no records yet"} />
        <StatCard label="Jobs (current)" value={fte.totalCurrent.toLocaleString()} sub={`from ${fte.withCurrentFte} businesses`} />
        <StatCard label="Jobs (planned)" value={fte.totalPlanned.toLocaleString()} sub={`from ${fte.withPlannedFte} businesses`} />
        <StatCard label="Avg revenue" value={revenue.withRevenue ? `$${(revenue.avg / 1000).toFixed(0)}K` : "—"} sub={`${revenue.withRevenue} reported`} />
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
          <SectionHead>Formation type (LARA)</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {byFormationType.map(({ type, count }) => (
              <BarRow key={type} label={type} value={count} max={maxForm} color="var(--color-teal-accent)" />
            ))}
            <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
              {total - byFormationType.reduce((s, f) => s + f.count, 0)} with no formation type recorded
            </p>
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

        {/* LARA formations by year */}
        {byLaraYear.length > 0 ? (
          <div className="card" style={{ padding: "1.25rem" }}>
            <SectionHead>Formations by quarter (LARA date)</SectionHead>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {byLaraYear.map(({ year, count }) => (
                <BarRow key={year} label={year} value={count} max={Math.max(...byLaraYear.map(y => y.count), 1)} color="var(--color-teal-accent)" />
              ))}
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>{withLaraDate} of {total} have a LARA date recorded</p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: "1.25rem" }}>
            <SectionHead>Formations by quarter (LARA date)</SectionHead>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No LARA dates recorded yet. Add them via the edit drawer on each entrepreneur.</p>
          </div>
        )}

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

      {/* Funding breakdown */}
      {funding && funding.count > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <SectionHead>Funding by type</SectionHead>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {funding.byType.map(({ type, total: amt, count }) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", minWidth: "90px", flexShrink: 0 }}>{FUNDING_LABELS[type as FundingType] ?? type}</span>
                  <Bar value={amt} max={funding.total} color={FUNDING_COLORS[type as FundingType] ?? "var(--color-dome-gold)"} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-limestone)", minWidth: "70px", textAlign: "right" }}>${(amt / 1000).toFixed(0)}K</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", minWidth: "20px" }}>×{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <SectionHead>Top funders</SectionHead>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {funding.topSources.map(({ source, total: amt, count }) => (
                <div key={source} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", minWidth: "120px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{source}</span>
                  <Bar value={amt} max={funding.topSources[0]?.total ?? 1} color="var(--color-dome-gold)" />
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-limestone)", minWidth: "60px", textAlign: "right" }}>${(amt / 1000).toFixed(0)}K</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", minWidth: "20px" }}>×{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
  const [filterCohort, setFilterCohort] = useState("");
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [stageSaving, setStageSaving] = useState<Record<string, boolean>>({});
  const [dateSaving, setDateSaving] = useState<Record<string, boolean>>({});
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const load = useCallback((query = q, stage = filterStage, industry = filterIndustry, cohort = filterCohort) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (stage) params.set("stage", stage);
    if (industry) params.set("industry", industry);
    if (cohort) params.set("cohortId", cohort);
    return fetch(`/api/admin/cohort?${params}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); });
  }, [q, filterStage, filterIndustry, filterCohort]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [session, status, router, load]);

  useEffect(() => {
    fetch("/api/admin/cohorts").then(r => r.json()).then(setCohorts);
  }, []);

  // Auto-open drawer when ?open=<businessId> is in the URL
  useEffect(() => {
    if (loading || entries.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("open");
    if (openId && !selected) {
      const entry = entries.find(e => e.id === openId);
      if (entry) setSelected(entry);
    }
  }, [loading, entries]);

  async function quickDateConnected(id: string, value: string) {
    const leapSubmittedAt = value || null;
    setDateSaving((s) => ({ ...s, [id]: true }));
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, leapSubmittedAt } : e));
    await fetch(`/api/admin/cohort/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leapSubmittedAt }),
    });
    setDateSaving((s) => ({ ...s, [id]: false }));
  }

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
      case "county":   return (e.street ?? e.county ?? e.city ?? "").toLowerCase();
      case "fte":      return e.currentFte ?? -1;
      case "cohort":   return (e.cohort?.name ?? "").toLowerCase();
      case "date":     return e.leapSubmittedAt ?? "";
      case "laraId":   return (e.laraId ?? "").toLowerCase();
      case "laraDate": return e.laraDate ?? "";
      case "hours":    return e.trekHours;
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
          <Link href="/admin/cohort/import" className="btn btn--ghost" style={{ fontSize: "0.85rem" }}>Import from PDF / text</Link>
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
          onChange={(e) => { setQ(e.target.value); load(e.target.value, filterStage, filterIndustry, filterCohort); }}
          style={{ ...inp, minWidth: "260px", width: "auto" }}
        />
        <select value={filterIndustry}
          onChange={(e) => { setFilterIndustry(e.target.value); load(q, filterStage, e.target.value, filterCohort); }}
          style={{ ...inp, width: "auto" }}
        >
          <option value="">All industries</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        {cohorts.length > 0 && (
          <select value={filterCohort}
            onChange={(e) => { setFilterCohort(e.target.value); load(q, filterStage, filterIndustry, e.target.value); }}
            style={{ ...inp, width: "auto" }}
          >
            <option value="">All cohorts</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {(q || filterStage || filterIndustry || filterCohort) && (
          <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }}
            onClick={() => { setQ(""); setFilterStage(""); setFilterIndustry(""); setFilterCohort(""); load("", "", "", ""); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", overflowX: "auto" }}>
        <table className="ll-table" style={{ minWidth: "900px" }}>
          <thead>
            <tr>
              {([
                ["name",     "Business / Entrepreneur"],
                ["email",    "Contact"],
                ["laraId",   "LARA ID"],
                ["laraDate", "LARA Date"],
                ["hours",    "Hours"],
                ["stage",    "Stage"],
                ["industry", "Industry"],
                ["county",   "Address"],
                ["fte",      "FTEs"],
                ["cohort",   "Cohort"],
                ["date",     "Date Connected"],
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
              <tr><td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>No entries found.</td></tr>
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
                  <td style={{ fontSize: "0.78rem", fontFamily: "monospace" }}>
                    {e.laraId ?? "—"}
                  </td>
                  <td style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                    {e.laraDate ? new Date(e.laraDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td style={{ fontSize: "0.85rem", fontWeight: e.trekHours > 0 ? 700 : 400, color: e.trekHours > 0 ? "var(--color-dome-gold)" : "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                    {e.trekHours > 0 ? `${e.trekHours}h` : "—"}
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
                    {e.street && <p style={{ color: "var(--color-limestone)" }}>{e.street}</p>}
                    {(e.city || e.state || e.zip) && <p style={{ color: "var(--color-text-muted)" }}>{[e.city, e.state].filter(Boolean).join(", ")}{e.zip ? ` ${e.zip}` : ""}</p>}
                    {e.county && <p style={{ color: "var(--color-text-muted)", fontSize: "0.72rem" }}>{e.county} Co.</p>}
                    {!e.street && !e.county && !e.city && !e.state && !e.zip && "—"}
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {e.currentFte != null && <span>{e.currentFte} now</span>}
                    {e.plannedFte != null && <span style={{ color: "var(--color-text-muted)", display: "block" }}>{e.plannedFte} planned</span>}
                    {e.currentFte == null && e.plannedFte == null && "—"}
                  </td>
                  <td>
                    {e.cohort ? (
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 7px", borderRadius: "3px", background: "rgba(74,155,142,0.1)", color: "var(--color-teal-accent)", whiteSpace: "nowrap" }}>
                        {e.cohort.name}
                      </span>
                    ) : <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>—</span>}
                  </td>
                  <td onClick={ev => ev.stopPropagation()}>
                    <input
                      type="date"
                      value={e.leapSubmittedAt ? e.leapSubmittedAt.slice(0, 10) : ""}
                      onChange={ev => quickDateConnected(e.id, ev.target.value)}
                      style={{ ...inpSm, width: "120px", fontSize: "0.75rem", cursor: "pointer" }}
                    />
                    {dateSaving[e.id] && <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", display: "block" }}>Saving…</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Click any row to edit. Stage and date connected save immediately inline. Imported entrepreneurs can claim their account by registering with their email.
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

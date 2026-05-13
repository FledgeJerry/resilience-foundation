"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type BusinessType = "UNDECIDED" | "TRADITIONAL" | "COOP";
type BusinessStage =
  | "IDEA" | "KNOW_GROUND" | "FIND_PEOPLE" | "BUILD_STRUCTURE"
  | "TEST_SMALL" | "GET_SUPPORT" | "SUSTAIN" | "GROW";
type ContactType = "LEAD" | "CUSTOMER" | "ADVISOR" | "PARTNER" | "INVESTOR" | "TEAM" | "OTHER";
type DealStage = "PROSPECT" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
type TxType = "INCOME" | "EXPENSE";

type Contact = {
  id: string; businessId: string; type: ContactType; name: string;
  email: string | null; phone: string | null; company: string | null;
  notes: string | null; tags: string[]; createdAt: string;
};
type Deal = {
  id: string; businessId: string; contactId: string | null; title: string;
  value: number | null; stage: DealStage; notes: string | null;
  closeDate: string | null; createdAt: string;
  contact: { id: string; name: string } | null;
};
type Transaction = {
  id: string; businessId: string; date: string; type: TxType;
  category: string; description: string | null; amount: number;
};
type Business = {
  id: string; name: string; description: string | null; type: BusinessType;
  stage: BusinessStage; industry: string | null; city: string | null;
  state: string | null; website: string | null; notes: string | null;
  problemStatement: string | null; targetMarket: string | null; uniqueValue: string | null;
  role: string;
  contacts: Contact[]; deals: Deal[]; transactions: Transaction[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES: { key: BusinessStage; label: string; num: number; minStage?: BusinessStage }[] = [
  { key: "IDEA", label: "Idea", num: 1 },
  { key: "KNOW_GROUND", label: "Know Your Ground", num: 2 },
  { key: "FIND_PEOPLE", label: "Find Your People", num: 3 },
  { key: "BUILD_STRUCTURE", label: "Build Structure", num: 4 },
  { key: "TEST_SMALL", label: "Test Small", num: 5 },
  { key: "GET_SUPPORT", label: "Get Support", num: 6 },
  { key: "SUSTAIN", label: "Sustain It", num: 7 },
  { key: "GROW", label: "Grow the Ecosystem", num: 8 },
];
const STAGE_NUMS: Record<BusinessStage, number> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.num])
) as Record<BusinessStage, number>;

const CONTACT_TYPES: ContactType[] = ["LEAD", "CUSTOMER", "ADVISOR", "PARTNER", "INVESTOR", "TEAM", "OTHER"];
const DEAL_STAGES: DealStage[] = ["PROSPECT", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const TX_CATEGORIES = {
  INCOME: ["Revenue", "Grant", "Investment", "Loan", "Other Income"],
  EXPENSE: ["Payroll", "Rent", "Supplies", "Marketing", "Legal", "Tech", "Other Expense"],
};

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = "overview" | "contacts" | "deals" | "financials";
const TABS: { id: TabId; label: string; minStage?: number }[] = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Contacts", minStage: 3 },
  { id: "deals", label: "Deals", minStage: 5 },
  { id: "financials", label: "Financials", minStage: 7 },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  biz,
  onSave,
}: {
  biz: Business;
  onSave: (data: Partial<Business>) => Promise<void>;
}) {
  const [fields, setFields] = useState({
    name: biz.name,
    description: biz.description ?? "",
    industry: biz.industry ?? "",
    city: biz.city ?? "",
    state: biz.state ?? "",
    website: biz.website ?? "",
    notes: biz.notes ?? "",
    problemStatement: biz.problemStatement ?? "",
    targetMarket: biz.targetMarket ?? "",
    uniqueValue: biz.uniqueValue ?? "",
    type: biz.type,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(fields);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="tab-panel">
      <h2>Business Details</h2>
      <div className="form-row">
        <label>
          Business name
          <input value={fields.name} onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Description
          <textarea
            value={fields.description}
            onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="What does this business do?"
          />
        </label>
      </div>
      <div className="form-row form-row--3col">
        <label>
          Industry
          <input value={fields.industry} onChange={(e) => setFields((f) => ({ ...f, industry: e.target.value }))} />
        </label>
        <label>
          City
          <input value={fields.city} onChange={(e) => setFields((f) => ({ ...f, city: e.target.value }))} />
        </label>
        <label>
          State
          <input value={fields.state} onChange={(e) => setFields((f) => ({ ...f, state: e.target.value }))} maxLength={2} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Website
          <input value={fields.website} onChange={(e) => setFields((f) => ({ ...f, website: e.target.value }))} placeholder="https://" />
        </label>
      </div>

      <h3 className="form-section-heading">Path</h3>
      <div className="form-row">
        <label>
          Business structure
          <select value={fields.type} onChange={(e) => setFields((f) => ({ ...f, type: e.target.value as BusinessType }))}>
            <option value="UNDECIDED">Undecided — figuring it out</option>
            <option value="TRADITIONAL">Traditional (LLC, Corp, etc.)</option>
            <option value="COOP">Worker Co-op</option>
          </select>
        </label>
      </div>

      <h3 className="form-section-heading">Strategy Basics</h3>
      <div className="form-row">
        <label>
          Problem statement — what pain are you solving?
          <textarea
            value={fields.problemStatement}
            onChange={(e) => setFields((f) => ({ ...f, problemStatement: e.target.value }))}
            rows={2}
            placeholder="e.g. People in Lansing can't find affordable healthy food within a mile of their home."
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Target market — who specifically benefits?
          <textarea
            value={fields.targetMarket}
            onChange={(e) => setFields((f) => ({ ...f, targetMarket: e.target.value }))}
            rows={2}
            placeholder="e.g. ALICE households in Lansing's south side, especially families with kids."
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Unique value — why you, why now?
          <textarea
            value={fields.uniqueValue}
            onChange={(e) => setFields((f) => ({ ...f, uniqueValue: e.target.value }))}
            rows={2}
            placeholder="e.g. Co-owned by the community it serves — decisions made by members, not investors."
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Notes
          <textarea
            value={fields.notes}
            onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn--primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ── Contacts Tab ──────────────────────────────────────────────────────────────

function ContactsTab({ biz, onSave }: { biz: Business; onSave: (data: Partial<Business>) => Promise<void> }) {
  const [contacts, setContacts] = useState<Contact[]>(biz.contacts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "LEAD" as ContactType, name: "", email: "", phone: "", company: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/journey/businesses/${biz.id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const c = await res.json();
    setContacts((prev) => [...prev, c]);
    setForm({ type: "LEAD", name: "", email: "", phone: "", company: "", notes: "" });
    setShowForm(false);
    setSaving(false);
    void onSave({});
  }

  async function remove(id: string) {
    await fetch(`/api/journey/businesses/${biz.id}/contacts/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    void onSave({});
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/journey/businesses/${biz.id}/contacts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const c = await res.json();
    setContacts((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    setEditing(null);
    setSaving(false);
  }

  return (
    <div className="tab-panel">
      <div className="tab-panel__header">
        <h2>Contacts</h2>
        <button className="btn btn--sm btn--primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add contact"}
        </button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={add}>
          <div className="form-row form-row--2col">
            <label>
              Type
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContactType }))}>
                {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
            <label>
              Name <span className="required">*</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
          </div>
          <div className="form-row form-row--3col">
            <label>Email<input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
            <label>Phone<input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></label>
            <label>Company<input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} /></label>
          </div>
          <div className="form-row">
            <label>Notes<textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={1} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary btn--sm" type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add contact"}
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form className="inline-form inline-form--edit" onSubmit={saveEdit}>
          <h3>Edit contact</h3>
          <div className="form-row form-row--2col">
            <label>
              Type
              <select value={editing.type} onChange={(e) => setEditing((c) => c && { ...c, type: e.target.value as ContactType })}>
                {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
            <label>Name<input value={editing.name} onChange={(e) => setEditing((c) => c && { ...c, name: e.target.value })} required /></label>
          </div>
          <div className="form-row form-row--3col">
            <label>Email<input value={editing.email ?? ""} onChange={(e) => setEditing((c) => c && { ...c, email: e.target.value })} /></label>
            <label>Phone<input value={editing.phone ?? ""} onChange={(e) => setEditing((c) => c && { ...c, phone: e.target.value })} /></label>
            <label>Company<input value={editing.company ?? ""} onChange={(e) => setEditing((c) => c && { ...c, company: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label>Notes<textarea value={editing.notes ?? ""} onChange={(e) => setEditing((c) => c && { ...c, notes: e.target.value })} rows={1} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary btn--sm" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <p className="empty-hint">No contacts yet. Add customers, leads, advisors, and team members here.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Company</th><th>Email / Phone</th><th></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td><span className={`tag tag--${c.type.toLowerCase()}`}>{c.type.toLowerCase()}</span></td>
                <td>{c.company ?? "—"}</td>
                <td className="contact-reach">{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}{c.phone && <span>{c.phone}</span>}</td>
                <td className="row-actions">
                  <button className="btn-icon" title="Edit" onClick={() => setEditing(c)}>✎</button>
                  <button className="btn-icon btn-icon--danger" title="Remove" onClick={() => remove(c.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Deals Tab ─────────────────────────────────────────────────────────────────

function DealsTab({ biz, onSave }: { biz: Business; onSave: (data: Partial<Business>) => Promise<void> }) {
  const [deals, setDeals] = useState<Deal[]>(biz.deals);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", value: "", stage: "PROSPECT" as DealStage, contactId: "", notes: "", closeDate: "",
  });

  const totalPipeline = deals
    .filter((d) => !["WON", "LOST"].includes(d.stage))
    .reduce((sum, d) => sum + (d.value ?? 0), 0);
  const totalWon = deals.filter((d) => d.stage === "WON").reduce((sum, d) => sum + (d.value ?? 0), 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/journey/businesses/${biz.id}/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, value: form.value ? Number(form.value) : null, contactId: form.contactId || null }),
    });
    const d = await res.json();
    setDeals((prev) => [d, ...prev]);
    setForm({ title: "", value: "", stage: "PROSPECT", contactId: "", notes: "", closeDate: "" });
    setShowForm(false);
    setSaving(false);
    void onSave({});
  }

  async function updateStage(id: string, stage: DealStage) {
    const res = await fetch(`/api/journey/businesses/${biz.id}/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    const d = await res.json();
    setDeals((prev) => prev.map((x) => (x.id === id ? d : x)));
  }

  async function remove(id: string) {
    await fetch(`/api/journey/businesses/${biz.id}/deals/${id}`, { method: "DELETE" });
    setDeals((prev) => prev.filter((d) => d.id !== id));
    void onSave({});
  }

  return (
    <div className="tab-panel">
      <div className="tab-panel__header">
        <h2>Deals</h2>
        <button className="btn btn--sm btn--primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add deal"}
        </button>
      </div>

      <div className="deals-summary">
        <div className="deals-summary__stat">
          <span className="deals-summary__label">Pipeline</span>
          <span className="deals-summary__value">{fmt$(totalPipeline)}</span>
        </div>
        <div className="deals-summary__stat">
          <span className="deals-summary__label">Won</span>
          <span className="deals-summary__value deals-summary__value--won">{fmt$(totalWon)}</span>
        </div>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={add}>
          <div className="form-row form-row--2col">
            <label>Deal name <span className="required">*</span>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g. First catering contract" />
            </label>
            <label>Value ($)
              <input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="0" min={0} />
            </label>
          </div>
          <div className="form-row form-row--3col">
            <label>Stage
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as DealStage }))}>
                {DEAL_STAGES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
            <label>Contact
              <select value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}>
                <option value="">— none —</option>
                {biz.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Expected close
              <input type="date" value={form.closeDate} onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))} />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary btn--sm" type="submit" disabled={saving}>{saving ? "Adding…" : "Add deal"}</button>
          </div>
        </form>
      )}

      {deals.length === 0 ? (
        <p className="empty-hint">No deals yet. Track potential contracts, clients, or revenue opportunities here.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Deal</th><th>Contact</th><th>Value</th><th>Stage</th><th>Close</th><th></th></tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.contact?.name ?? "—"}</td>
                <td>{d.value != null ? fmt$(d.value) : "—"}</td>
                <td>
                  <select
                    value={d.stage}
                    className={`stage-select stage-select--${d.stage.toLowerCase()}`}
                    onChange={(e) => updateStage(d.id, e.target.value as DealStage)}
                  >
                    {DEAL_STAGES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </td>
                <td>{d.closeDate ? fmtDate(d.closeDate) : "—"}</td>
                <td className="row-actions">
                  <button className="btn-icon btn-icon--danger" title="Remove" onClick={() => remove(d.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Financials Tab ────────────────────────────────────────────────────────────

function FinancialsTab({ biz, onSave }: { biz: Business; onSave: (data: Partial<Business>) => Promise<void> }) {
  const [txs, setTxs] = useState<Transaction[]>(biz.transactions);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: "", type: "INCOME" as TxType, category: "Revenue", description: "", amount: "" });

  const totalIncome = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/journey/businesses/${biz.id}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const tx = await res.json();
    setTxs((prev) => [tx, ...prev]);
    setForm({ date: "", type: "INCOME", category: "Revenue", description: "", amount: "" });
    setShowForm(false);
    setSaving(false);
    void onSave({});
  }

  async function remove(id: string) {
    await fetch(`/api/journey/businesses/${biz.id}/transactions/${id}`, { method: "DELETE" });
    setTxs((prev) => prev.filter((t) => t.id !== id));
    void onSave({});
  }

  const categories = TX_CATEGORIES[form.type];

  return (
    <div className="tab-panel">
      <div className="tab-panel__header">
        <h2>Financials</h2>
        <button className="btn btn--sm btn--primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add entry"}
        </button>
      </div>

      <div className="fin-summary">
        <div className="fin-summary__stat fin-summary__stat--income">
          <span>Income</span><strong>{fmt$(totalIncome)}</strong>
        </div>
        <div className="fin-summary__stat fin-summary__stat--expense">
          <span>Expenses</span><strong>{fmt$(totalExpense)}</strong>
        </div>
        <div className={`fin-summary__stat fin-summary__stat--net ${net >= 0 ? "positive" : "negative"}`}>
          <span>Net</span><strong>{fmt$(net)}</strong>
        </div>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={add}>
          <div className="form-row form-row--3col">
            <label>Date
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            </label>
            <label>Type
              <select
                value={form.type}
                onChange={(e) => {
                  const t = e.target.value as TxType;
                  setForm((f) => ({ ...f, type: t, category: TX_CATEGORIES[t][0] }));
                }}
              >
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </label>
            <label>Category
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row form-row--2col">
            <label>Description
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <label>Amount ($) <span className="required">*</span>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required min={0} step={0.01} />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary btn--sm" type="submit" disabled={saving}>{saving ? "Adding…" : "Add entry"}</button>
          </div>
        </form>
      )}

      {txs.length === 0 ? (
        <p className="empty-hint">No transactions yet. Track revenue and expenses here for a full P&L picture.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th></th></tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id}>
                <td>{fmtDate(t.date)}</td>
                <td><span className={`tag tag--${t.type.toLowerCase()}`}>{t.type.toLowerCase()}</span></td>
                <td>{t.category}</td>
                <td>{t.description ?? "—"}</td>
                <td className={t.type === "INCOME" ? "amount-income" : "amount-expense"}>
                  {t.type === "EXPENSE" ? "−" : "+"}{fmt$(t.amount)}
                </td>
                <td className="row-actions">
                  <button className="btn-icon btn-icon--danger" title="Remove" onClick={() => remove(t.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Stage Tracker ─────────────────────────────────────────────────────────────

function StageTracker({
  currentStage,
  bizType,
  onStageChange,
}: {
  currentStage: BusinessStage;
  bizType: BusinessType;
  onStageChange: (s: BusinessStage) => Promise<void>;
}) {
  const currentNum = STAGE_NUMS[currentStage];

  return (
    <div className="stage-tracker">
      {STAGES.map((s) => {
        const done = s.num < currentNum;
        const active = s.key === currentStage;
        const isFork = s.key === "BUILD_STRUCTURE";
        return (
          <button
            key={s.key}
            className={`stage-pip${done ? " done" : ""}${active ? " active" : ""}${isFork ? " fork" : ""}`}
            title={s.label}
            onClick={() => onStageChange(s.key)}
          >
            <span className="stage-pip__num">{done ? "✓" : s.num}</span>
            <span className="stage-pip__label">
              {s.label}
              {isFork && bizType !== "UNDECIDED" && (
                <span className={`stage-pip__path stage-pip__path--${bizType.toLowerCase()}`}>
                  {bizType === "COOP" ? "Co-op" : "Traditional"}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BusinessWorkbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    fetch(`/api/journey/businesses/${id}`)
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        if (r.status === 404) { router.push("/journey/businesses"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setBiz(data); })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function save(data: Partial<Business>) {
    const res = await fetch(`/api/journey/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setBiz((prev) => prev ? { ...prev, ...updated } : prev);
    }
  }

  async function changeStage(stage: BusinessStage) {
    setBiz((prev) => prev ? { ...prev, stage } : prev);
    await save({ stage });
  }

  if (loading) return <main className="container"><p className="loading-text">Loading…</p></main>;
  if (!biz) return null;

  const currentStageNum = STAGE_NUMS[biz.stage];

  const availableTabs = TABS.filter((t) => !t.minStage || currentStageNum >= t.minStage);
  const lockedTabs = TABS.filter((t) => t.minStage && currentStageNum < t.minStage);

  return (
    <main className="journey-workbook">
      <div className="container">
        {/* Header */}
        <div className="workbook-header">
          <div>
            <Link href="/journey/businesses" className="back-link">← My Businesses</Link>
            <h1 className="workbook-title">{biz.name}</h1>
            <div className="workbook-meta">
              <span className={`type-badge type-badge--${biz.type.toLowerCase()}`}>
                {biz.type === "UNDECIDED" ? "Path undecided" : biz.type === "COOP" ? "Worker Co-op" : "Traditional"}
              </span>
              {biz.industry && <span>{biz.industry}</span>}
              {(biz.city || biz.state) && <span>{[biz.city, biz.state].filter(Boolean).join(", ")}</span>}
            </div>
          </div>
        </div>

        {/* Stage Tracker */}
        <StageTracker currentStage={biz.stage} bizType={biz.type} onStageChange={changeStage} />

        {/* Tabs */}
        <div className="workbook-tabs">
          {availableTabs.map((t) => (
            <button
              key={t.id}
              className={`workbook-tab${activeTab === t.id ? " active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          {lockedTabs.map((t) => (
            <button key={t.id} className="workbook-tab workbook-tab--locked" disabled title={`Unlocks at stage ${t.minStage}`}>
              {t.label} 🔒
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="workbook-body">
          {activeTab === "overview" && <OverviewTab biz={biz} onSave={save} />}
          {activeTab === "contacts" && <ContactsTab biz={biz} onSave={save} />}
          {activeTab === "deals" && <DealsTab biz={biz} onSave={save} />}
          {activeTab === "financials" && <FinancialsTab biz={biz} onSave={save} />}
        </div>
      </div>
    </main>
  );
}

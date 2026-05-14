"use client";

import { useCallback, useEffect, useState, use, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProposalsPanel from "@/components/ProposalsPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type Shareholder = {
  id: string; name: string; email: string | null; phone: string | null;
  shareCount: number; amountPaid: number; isTreasury: boolean; notes: string | null;
  isRenter: boolean; monthlyRentPaid: number | null; moveInDate: string | null;
  moveOutDate: string | null; equityBalance: number;
  securityDeposit: number | null; leaseEndDate: string | null;
  occupantCount: number | null; emergencyContactName: string | null; emergencyContactPhone: string | null;
};
type TreasuryEntry = {
  id: string; date: string; type: "INCOME" | "EXPENSE";
  category: string; description: string | null; amount: number;
};
type TreasuryVote = {
  id: string; periodLabel: string; surplus: number; decision: string;
  amountDistributed: number; notes: string | null; createdAt: string;
};
type Project = {
  id: string; name: string; status: string;
  address: string | null; purchasePrice: number | null; renovationCost: number | null;
  postRenoValue: number | null; targetCloseDate: string | null; notes: string | null;
  totalShares: number; treasuryReservePct: number;
  quorumPct: number; simpleThreshold: number; superThreshold: number;
  meetingCadence: string; disputeProcess: string;
  monthlyRent: number | null; propertyTax: number | null; insurance: number | null;
  maintenanceReserve: number | null; rainyDayPct: number;
  mortgageInterestRate: number; mortgageLoanTerm: number;
  shareholders: Shareholder[];
  treasuryEntries: TreasuryEntry[];
  treasuryVotes: TreasuryVote[];
};

// ─── Derived math ─────────────────────────────────────────────────────────────

function dealMath(p: Project) {
  const totalRaise = (p.purchasePrice ?? 0) + (p.renovationCost ?? 0);
  const treasuryShares = Math.round(p.totalShares * p.treasuryReservePct / 100);
  const publicShares = p.totalShares - treasuryShares;
  const issuePrice = publicShares > 0 && totalRaise > 0 ? totalRaise / publicShares : 0;
  const perShareValue = p.postRenoValue && p.totalShares > 0 ? p.postRenoValue / p.totalShares : 0;
  const equityBuffer = (p.postRenoValue ?? 0) - totalRaise;
  return { totalRaise, treasuryShares, publicShares, issuePrice, perShareValue, equityBuffer };
}

function treasuryMath(p: Project) {
  const entries = p.treasuryEntries;
  const totalIncome = entries.filter(e => e.type === "INCOME").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "EXPENSE").reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpense;
  return { totalIncome, totalExpense, net };
}

// Cumulative principal paid through month N on a given principal/rate/term
function amortCumulativePrincipal(principal: number, annualRatePct: number, termYears: number, throughMonth: number): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0 || n === 0) return principal * (throughMonth / n);
  const M = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  let balance = principal;
  let cum = 0;
  const months = Math.min(throughMonth, n);
  for (let i = 0; i < months; i++) {
    const interest = balance * r;
    const pmt = Math.min(M, balance + interest);
    const principalPmt = pmt - interest;
    cum += principalPmt;
    balance = Math.max(0, balance - principalPmt);
  }
  return cum;
}

// Given a renter's moveInDate, calculate elapsed months and earned equity
function calcRenterEquity(renter: Shareholder, project: Project) {
  if (!renter.isRenter || !renter.moveInDate || !project.postRenoValue) return null;
  const principal = project.postRenoValue;
  const rate = project.mortgageInterestRate;
  const term = project.mortgageLoanTerm;
  const shareValue = principal / project.totalShares;
  const moveIn = new Date(renter.moveInDate);
  const cutoff = renter.moveOutDate ? new Date(renter.moveOutDate) : new Date();
  const elapsedMonths = Math.max(0, (cutoff.getFullYear() - moveIn.getFullYear()) * 12 + (cutoff.getMonth() - moveIn.getMonth()));
  const cumulativePrincipal = amortCumulativePrincipal(principal, rate, term, elapsedMonths);
  const totalSharesEarnable = Math.floor(cumulativePrincipal / shareValue);
  const sharesAlreadyHeld = renter.shareCount;
  const newSharesDue = Math.max(0, totalSharesEarnable - sharesAlreadyHeld);
  const newEquityBalance = cumulativePrincipal - totalSharesEarnable * shareValue + renter.equityBalance;
  const nextMonthPrincipal = renter.moveOutDate
    ? 0
    : amortCumulativePrincipal(principal, rate, term, elapsedMonths + 1) - cumulativePrincipal;
  return { elapsedMonths, cumulativePrincipal, totalSharesEarnable, sharesAlreadyHeld, newSharesDue, newEquityBalance, shareValue, nextMonthPrincipal };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)",
  borderRadius: "6px", padding: "0.6rem 0.875rem", color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)", fontSize: "0.95rem", outline: "none",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{hint}</p>}
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "0.75rem 1rem", textAlign: "center" }}>
      <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontWeight: 700, fontSize: "1rem", color: accent ? "var(--color-dome-gold)" : "var(--color-limestone)" }}>{value}</p>
    </div>
  );
}

const TABS = ["Property", "Offering", "Shareholders", "Governance", "Treasury", "Documents", "Proposals"] as const;
type Tab = (typeof TABS)[number];

const STATUS_OPTIONS = ["PLANNING", "RAISING", "PURCHASED", "RENOVATING", "RENTING", "SOLD"];

// ─── Tab: Property ────────────────────────────────────────────────────────────

function PropertyTab({ project, onSave }: { project: Project; onSave: (data: Partial<Project>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: project.name, status: project.status,
    address: project.address ?? "", purchasePrice: project.purchasePrice?.toString() ?? "",
    renovationCost: project.renovationCost?.toString() ?? "",
    postRenoValue: project.postRenoValue?.toString() ?? "",
    targetCloseDate: project.targetCloseDate ? project.targetCloseDate.slice(0, 10) : "",
    notes: project.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({
      name: form.name, status: form.status, address: form.address || null,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
      renovationCost: form.renovationCost ? parseFloat(form.renovationCost) : null,
      postRenoValue: form.postRenoValue ? parseFloat(form.postRenoValue) : null,
      targetCloseDate: form.targetCloseDate ? form.targetCloseDate : null,
      notes: form.notes || null,
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "560px" }}>
      <Field label="Project name"><input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="Status">
        <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
      </Field>
      <Field label="Property address" hint="Full street address including city, state, zip">
        <input style={inputStyle} value={form.address} onChange={e => set("address", e.target.value)} placeholder="e.g. 123 Maple St, Lansing, MI 48906" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Field label="Purchase price ($)">
          <input type="number" style={inputStyle} value={form.purchasePrice} onChange={e => set("purchasePrice", e.target.value)} placeholder="50000" />
        </Field>
        <Field label="Renovation budget ($)">
          <input type="number" style={inputStyle} value={form.renovationCost} onChange={e => set("renovationCost", e.target.value)} placeholder="25000" />
        </Field>
        <Field label="Post-renovation value ($)" hint="Conservative ARV">
          <input type="number" style={inputStyle} value={form.postRenoValue} onChange={e => set("postRenoValue", e.target.value)} placeholder="100000" />
        </Field>
        <Field label="Target close date">
          <input type="date" style={inputStyle} value={form.targetCloseDate} onChange={e => set("targetCloseDate", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes / property description">
        <textarea style={{ ...inputStyle, minHeight: "100px" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Bedrooms, lot size, neighborhood notes, condition, seller situation…" />
      </Field>
      <button className="btn btn--primary" style={{ alignSelf: "flex-start" }} onClick={save} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save property"}
      </button>
    </div>
  );
}

// ─── Tab: Offering ────────────────────────────────────────────────────────────

function OfferingTab({ project, onSave }: { project: Project; onSave: (data: Partial<Project>) => Promise<void> }) {
  const [form, setForm] = useState({
    totalShares: project.totalShares.toString(),
    treasuryReservePct: project.treasuryReservePct.toString(),
    mortgageInterestRate: project.mortgageInterestRate.toString(),
    mortgageLoanTerm: project.mortgageLoanTerm.toString(),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalShares = Math.max(1, parseInt(form.totalShares) || 1000);
  const reservePct = Math.min(99, Math.max(0, parseFloat(form.treasuryReservePct) || 10));
  const treasuryShares = Math.round(totalShares * reservePct / 100);
  const publicShares = totalShares - treasuryShares;
  const totalRaise = (project.purchasePrice ?? 0) + (project.renovationCost ?? 0);
  const issuePrice = publicShares > 0 && totalRaise > 0 ? totalRaise / publicShares : 0;
  const perShareValue = project.postRenoValue && totalShares > 0 ? project.postRenoValue / totalShares : 0;
  const treasuryStake = treasuryShares * perShareValue;

  async function save() {
    setSaving(true);
    await onSave({
      totalShares, treasuryReservePct: reservePct,
      mortgageInterestRate: parseFloat(form.mortgageInterestRate) || 7,
      mortgageLoanTerm: parseInt(form.mortgageLoanTerm) || 30,
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "480px" }}>
        <Field label="Total shares to issue" hint="Post-renovation, each share = post-reno value ÷ total shares.">
          <input type="number" style={inputStyle} value={form.totalShares} onChange={e => setForm(f => ({ ...f, totalShares: e.target.value }))} />
        </Field>
        <Field label="Treasury reserve (%)" hint="Shares held by the treasury — reserved for renter equity transfers, future sales, and liquidity.">
          <input type="number" min="0" max="99" style={inputStyle} value={form.treasuryReservePct} onChange={e => setForm(f => ({ ...f, treasuryReservePct: e.target.value }))} />
        </Field>
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>Renter equity parameters</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Field label="Reference mortgage rate (%/yr)" hint="Used to calculate monthly principal → shares earned.">
              <input type="number" min="0" max="25" step="0.25" style={inputStyle} value={form.mortgageInterestRate} onChange={e => setForm(f => ({ ...f, mortgageInterestRate: e.target.value }))} />
            </Field>
            <Field label="Loan term (years)">
              <input type="number" min="1" max="50" style={inputStyle} value={form.mortgageLoanTerm} onChange={e => setForm(f => ({ ...f, mortgageLoanTerm: e.target.value }))} />
            </Field>
          </div>
          {project.postRenoValue && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
              Month 1 renter equity: <strong style={{ color: "var(--color-teal-accent)" }}>
                ${amortCumulativePrincipal(project.postRenoValue, parseFloat(form.mortgageInterestRate) || 7, parseInt(form.mortgageLoanTerm) || 30, 1).toFixed(2)}
              </strong> principal → 1 share every ${perShareValue > 0 ? `$${perShareValue.toFixed(2)}` : "—"} accumulated.
            </p>
          )}
        </div>
      </div>

      {/* Share split bar */}
      <div>
        <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
          Share structure ({totalShares.toLocaleString()} total)
        </p>
        <div style={{ display: "flex", height: "20px", borderRadius: "4px", overflow: "hidden", marginBottom: "0.5rem" }}>
          <div style={{ flex: publicShares, background: "var(--color-dome-gold)" }} />
          <div style={{ flex: treasuryShares, background: "var(--color-river-blue)" }} />
        </div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem" }}>
          <span><span style={{ display: "inline-block", width: "10px", height: "10px", background: "var(--color-dome-gold)", borderRadius: "2px", marginRight: "0.4rem" }} />Public: <strong style={{ color: "var(--color-limestone)" }}>{publicShares.toLocaleString()}</strong></span>
          <span><span style={{ display: "inline-block", width: "10px", height: "10px", background: "var(--color-river-blue)", borderRadius: "2px", marginRight: "0.4rem" }} />Treasury: <strong style={{ color: "var(--color-limestone)" }}>{treasuryShares.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Live stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
        <StatChip label="Total raise" value={totalRaise > 0 ? `$${totalRaise.toLocaleString()}` : "—"} />
        <StatChip label="Issue price / share" value={issuePrice > 0 ? `$${issuePrice.toFixed(2)}` : "—"} accent />
        <StatChip label="Per-share value day 1" value={perShareValue > 0 ? `$${perShareValue.toFixed(2)}` : "—"} accent={perShareValue > issuePrice} />
        <StatChip label="Treasury stake (post-reno)" value={treasuryStake > 0 ? `$${treasuryStake.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} accent />
      </div>

      {!project.purchasePrice && <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>Enter purchase price and renovation cost on the Property tab to see live pricing.</p>}

      <button className="btn btn--primary" style={{ alignSelf: "flex-start" }} onClick={save} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save offering"}
      </button>
    </div>
  );
}

// ─── Tab: Shareholders ────────────────────────────────────────────────────────

type AddForm = {
  name: string; email: string; phone: string; shareCount: string;
  amountPaid: string; notes: string; isTreasury: boolean;
  isRenter: boolean; monthlyRentPaid: string; moveInDate: string;
  securityDeposit: string; leaseEndDate: string; occupantCount: string;
  emergencyContactName: string; emergencyContactPhone: string;
};

type EditForm = {
  name: string; email: string; phone: string; notes: string;
  shareCount: string; amountPaid: string;
  monthlyRentPaid: string; moveInDate: string; moveOutDate: string;
  securityDeposit: string; leaseEndDate: string; occupantCount: string;
  emergencyContactName: string; emergencyContactPhone: string;
};

function ShareholdersTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const [shareholders, setShareholders] = useState<Shareholder[]>(project.shareholders);
  const blank: AddForm = { name: "", email: "", phone: "", shareCount: "", amountPaid: "", notes: "", isTreasury: false, isRenter: false, monthlyRentPaid: "", moveInDate: "", securityDeposit: "", leaseEndDate: "", occupantCount: "", emergencyContactName: "", emergencyContactPhone: "" };
  const [form, setForm] = useState<AddForm>(blank);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "", phone: "", notes: "", shareCount: "", amountPaid: "", monthlyRentPaid: "", moveInDate: "", moveOutDate: "", securityDeposit: "", leaseEndDate: "", occupantCount: "", emergencyContactName: "", emergencyContactPhone: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { publicShares, treasuryShares, issuePrice, perShareValue } = dealMath(project);
  const sold = shareholders.filter(s => !s.isTreasury && !s.isRenter).reduce((s, h) => s + h.shareCount, 0);
  const renterShares = shareholders.filter(s => s.isRenter).reduce((s, h) => s + h.shareCount, 0);
  const treasurySold = shareholders.filter(s => s.isTreasury).reduce((s, h) => s + h.shareCount, 0);
  const totalRaised = shareholders.filter(s => !s.isRenter).reduce((s, h) => s + h.amountPaid, 0);
  const pct = publicShares > 0 ? Math.min(100, ((sold + renterShares) / publicShares) * 100) : 0;

  const setF = (k: keyof AddForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function addShareholder(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setAdding(true);
    const body: Record<string, unknown> = {
      name: form.name, email: form.email || null, phone: form.phone || null,
      notes: form.notes || null, isTreasury: form.isTreasury, isRenter: form.isRenter,
    };
    if (form.isRenter) {
      body.shareCount = 0;
      body.amountPaid = 0;
      body.monthlyRentPaid = form.monthlyRentPaid ? parseFloat(form.monthlyRentPaid) : null;
      body.moveInDate = form.moveInDate || null;
      body.securityDeposit = form.securityDeposit ? parseFloat(form.securityDeposit) : null;
      body.leaseEndDate = form.leaseEndDate || null;
      body.occupantCount = form.occupantCount ? parseInt(form.occupantCount) : null;
      body.emergencyContactName = form.emergencyContactName || null;
      body.emergencyContactPhone = form.emergencyContactPhone || null;
    } else {
      body.shareCount = parseInt(form.shareCount || "0");
      body.amountPaid = parseFloat(form.amountPaid || "0");
    }
    const res = await fetch(`/api/housing/projects/${project.id}/shareholders`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) {
      const s = await res.json();
      setShareholders(prev => [...prev, s]);
      setForm(blank);
      setShowForm(false);
      onRefresh();
    }
    setAdding(false);
  }

  function startEdit(s: Shareholder) {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      notes: s.notes ?? "",
      shareCount: s.shareCount.toString(),
      amountPaid: s.amountPaid.toString(),
      monthlyRentPaid: s.monthlyRentPaid?.toString() ?? "",
      moveInDate: s.moveInDate ? s.moveInDate.slice(0, 10) : "",
      moveOutDate: s.moveOutDate ? s.moveOutDate.slice(0, 10) : "",
      securityDeposit: s.securityDeposit?.toString() ?? "",
      leaseEndDate: s.leaseEndDate ? s.leaseEndDate.slice(0, 10) : "",
      occupantCount: s.occupantCount?.toString() ?? "",
      emergencyContactName: s.emergencyContactName ?? "",
      emergencyContactPhone: s.emergencyContactPhone ?? "",
    });
  }

  async function saveEdit(id: string) {
    const s = shareholders.find(sh => sh.id === id);
    if (!s) return;
    setSavingEdit(true);
    const body: Record<string, unknown> = {
      shareholderId: id,
      name: editForm.name.trim(),
      email: editForm.email || null,
      phone: editForm.phone || null,
      notes: editForm.notes || null,
    };
    if (s.isRenter) {
      body.monthlyRentPaid = editForm.monthlyRentPaid ? parseFloat(editForm.monthlyRentPaid) : null;
      body.moveInDate = editForm.moveInDate || null;
      body.moveOutDate = editForm.moveOutDate || null;
      body.securityDeposit = editForm.securityDeposit ? parseFloat(editForm.securityDeposit) : null;
      body.leaseEndDate = editForm.leaseEndDate || null;
      body.occupantCount = editForm.occupantCount ? parseInt(editForm.occupantCount) : null;
      body.emergencyContactName = editForm.emergencyContactName || null;
      body.emergencyContactPhone = editForm.emergencyContactPhone || null;
    } else {
      body.shareCount = parseInt(editForm.shareCount || "0");
      body.amountPaid = parseFloat(editForm.amountPaid || "0");
    }
    setEditError(null);
    const res = await fetch(`/api/housing/projects/${project.id}/shareholders`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setShareholders(prev => prev.map(sh => sh.id === id ? data : sh));
      setEditingId(null);
    } else {
      setEditError(data?.error ?? `Error ${res.status}`);
    }
    setSavingEdit(false);
  }

  // Process equity: calculate shares due based on amortization, transfer from treasury
  async function processEquity(shareholder: Shareholder) {
    const eq = calcRenterEquity(shareholder, project);
    if (!eq || eq.newSharesDue === 0) return;
    setProcessingId(shareholder.id);
    // Update shareholder: add earned shares, update equity balance
    const res = await fetch(`/api/housing/projects/${project.id}/shareholders`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shareholderId: shareholder.id,
        shareCount: shareholder.shareCount + eq.newSharesDue,
        equityBalance: eq.newEquityBalance,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setShareholders(prev => prev.map(s => s.id === shareholder.id ? updated : s));
    }
    setProcessingId(null);
  }

  async function remove(id: string) {
    if (!confirm("Remove this shareholder?")) return;
    const res = await fetch(`/api/housing/projects/${project.id}/shareholders`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareholderId: id }),
    });
    if (res.ok) { setShareholders(prev => prev.filter(s => s.id !== id)); onRefresh(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
        <StatChip label="Investor shares" value={`${sold} / ${publicShares}`} />
        <StatChip label="Renter equity shares" value={renterShares.toLocaleString()} accent={renterShares > 0} />
        <StatChip label="Treasury shares" value={`${treasurySold} / ${treasuryShares}`} />
        <StatChip label="Cash raised" value={`$${totalRaised.toLocaleString()}`} accent />
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ height: "8px", background: "var(--color-border-strong)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "var(--color-teal-accent)" : "var(--color-dome-gold)", transition: "width 0.3s" }} />
        </div>
        <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>Public shares allocated (investors + renters): {pct.toFixed(0)}%</p>
      </div>

      {/* Add form */}
      <div>
        <button className="btn btn--secondary btn--sm" onClick={() => setShowForm(v => !v)}>+ Add shareholder / renter</button>
        {showForm && (
          <form onSubmit={addShareholder} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.25rem", padding: "1.25rem", background: "var(--color-surface-raised)", borderRadius: "8px", border: "1px solid var(--color-border-strong)", maxWidth: "580px" }}>
            <Field label="Type">
              <select style={inputStyle} value={form.isRenter ? "renter" : form.isTreasury ? "treasury" : "investor"}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({ ...f, isRenter: v === "renter", isTreasury: v === "treasury" }));
                }}>
                <option value="investor">Investor — buying shares at issue price</option>
                <option value="renter">Renter — earns shares through rent payments</option>
                <option value="treasury">Treasury reserve</option>
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Field label="Name *"><input style={inputStyle} required value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Full name" /></Field>
              <Field label="Email"><input type="email" style={inputStyle} value={form.email} onChange={e => setF("email", e.target.value)} placeholder="optional" /></Field>
              <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="optional" /></Field>
              {form.isRenter ? (
                <>
                  <Field label="Monthly rent ($)" hint="What this renter actually pays">
                    <input type="number" min="0" style={inputStyle} value={form.monthlyRentPaid} onChange={e => setF("monthlyRentPaid", e.target.value)} placeholder="e.g. 900" />
                  </Field>
                  <Field label="Move-in date" hint="Equity accrual starts from this date">
                    <input type="date" style={inputStyle} value={form.moveInDate} onChange={e => setF("moveInDate", e.target.value)} />
                  </Field>
                  <Field label="Security deposit ($)">
                    <input type="number" min="0" style={inputStyle} value={form.securityDeposit} onChange={e => setF("securityDeposit", e.target.value)} placeholder="e.g. 900" />
                  </Field>
                  <Field label="Lease end date" hint="Leave blank for month-to-month">
                    <input type="date" style={inputStyle} value={form.leaseEndDate} onChange={e => setF("leaseEndDate", e.target.value)} />
                  </Field>
                  <Field label="# of occupants">
                    <input type="number" min="1" style={inputStyle} value={form.occupantCount} onChange={e => setF("occupantCount", e.target.value)} placeholder="1" />
                  </Field>
                  <Field label="Emergency contact name">
                    <input style={inputStyle} value={form.emergencyContactName} onChange={e => setF("emergencyContactName", e.target.value)} placeholder="optional" />
                  </Field>
                  <Field label="Emergency contact phone">
                    <input style={inputStyle} value={form.emergencyContactPhone} onChange={e => setF("emergencyContactPhone", e.target.value)} placeholder="optional" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Shares" hint={issuePrice > 0 ? `$${issuePrice.toFixed(2)} each` : undefined}>
                    <input type="number" style={inputStyle} min="0" value={form.shareCount} onChange={e => setF("shareCount", e.target.value)} placeholder="e.g. 10" />
                  </Field>
                  <Field label="Amount paid ($)">
                    <input type="number" style={inputStyle} min="0" value={form.amountPaid} onChange={e => setF("amountPaid", e.target.value)} placeholder="0" />
                  </Field>
                </>
              )}
            </div>
            <Field label="Notes"><input style={inputStyle} value={form.notes} onChange={e => setF("notes", e.target.value)} placeholder="Optional notes" /></Field>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn btn--primary btn--sm" disabled={adding}>{adding ? "Adding…" : "Add"}</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setShowForm(false); setForm(blank); }}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Table */}
      {shareholders.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="ll-table">
            <thead>
              <tr>
                <th>Name</th><th>Type</th><th>Shares</th><th>Equity value</th><th>Paid / rent</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shareholders.map(s => {
                const shareVal = perShareValue > 0 ? s.shareCount * perShareValue : 0;
                const due = issuePrice > 0 && !s.isRenter ? s.shareCount * issuePrice : 0;
                const paid = !s.isRenter && s.amountPaid >= due && due > 0;
                const eq = s.isRenter ? calcRenterEquity(s, project) : null;
                const isFormerRenter = s.isRenter && !!s.moveOutDate;

                return (
                  <Fragment key={s.id}>
                    <tr>
                      <td>
                        <p style={{ color: "var(--color-limestone)", fontWeight: 600, fontSize: "0.9rem" }}>{s.name}</p>
                        {s.email && <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{s.email}</p>}
                        {s.isRenter && s.monthlyRentPaid && !isFormerRenter && (
                          <p style={{ fontSize: "0.72rem", color: "var(--color-teal-accent)" }}>${s.monthlyRentPaid}/mo rent</p>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${s.isTreasury ? "badge--blue" : isFormerRenter ? "badge--muted" : s.isRenter ? "badge--teal" : "badge--gold"}`}>
                          {s.isTreasury ? "Treasury" : isFormerRenter ? "Former renter" : s.isRenter ? "Renter" : "Investor"}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "var(--color-limestone)" }}>{s.shareCount.toLocaleString()}</span>
                        {eq && eq.newSharesDue > 0 && (
                          <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "var(--color-dome-gold)" }}>+{eq.newSharesDue} due</span>
                        )}
                      </td>
                      <td style={{ color: shareVal > 0 ? "var(--color-dome-gold)" : "var(--color-text-muted)" }}>
                        {shareVal > 0 ? `$${shareVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                      </td>
                      <td>
                        {s.isRenter ? (
                          <div style={{ fontSize: "0.8rem" }}>
                            {s.moveInDate && <p style={{ color: "var(--color-text-muted)" }}>In: {new Date(s.moveInDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>}
                            {s.moveOutDate && <p style={{ color: "var(--color-dome-gold)" }}>Out: {new Date(s.moveOutDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>}
                            {eq && !isFormerRenter && <p style={{ color: "var(--color-text-secondary)" }}>${eq.cumulativePrincipal.toFixed(0)} principal</p>}
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-limestone)", fontSize: "0.9rem" }}>${s.amountPaid.toLocaleString()}</span>
                        )}
                      </td>
                      <td>
                        {s.isRenter ? (
                          eq && eq.newSharesDue > 0 ? (
                            <button className="btn btn--primary btn--sm" disabled={processingId === s.id} onClick={() => processEquity(s)}>
                              {processingId === s.id ? "…" : `Transfer ${eq.newSharesDue} shares`}
                            </button>
                          ) : (
                            <span className="badge badge--muted">{isFormerRenter ? "Settled" : eq ? "Up to date" : "No move-in date"}</span>
                          )
                        ) : (
                          <span className={`badge ${paid ? "badge--teal" : "badge--muted"}`}>{paid ? "Paid" : "Pending"}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                            className="btn btn--ghost btn--sm"
                          >
                            {editingId === s.id ? "Cancel" : "Edit"}
                          </button>
                          <button onClick={() => remove(s.id)} className="btn btn--danger btn--sm">Remove</button>
                        </div>
                      </td>
                    </tr>
                    {editingId === s.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: "1rem 1.25rem", background: "var(--color-surface)", borderTop: "none" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", maxWidth: "640px" }}>
                            <Field label="Name">
                              <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                            </Field>
                            <Field label="Email">
                              <input type="email" style={inputStyle} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="optional" />
                            </Field>
                            <Field label="Phone">
                              <input style={inputStyle} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="optional" />
                            </Field>
                            {s.isRenter ? (
                              <>
                                <Field label="Monthly rent ($)">
                                  <input type="number" style={inputStyle} value={editForm.monthlyRentPaid} onChange={e => setEditForm(f => ({ ...f, monthlyRentPaid: e.target.value }))} />
                                </Field>
                                <Field label="Move-in date">
                                  <input type="date" style={inputStyle} value={editForm.moveInDate} onChange={e => setEditForm(f => ({ ...f, moveInDate: e.target.value }))} />
                                </Field>
                                <Field label="Move-out date" hint="Set when renter leaves — equity freezes at this date">
                                  <input type="date" style={inputStyle} value={editForm.moveOutDate} onChange={e => setEditForm(f => ({ ...f, moveOutDate: e.target.value }))} />
                                </Field>
                                <Field label="Security deposit ($)">
                                  <input type="number" min="0" style={inputStyle} value={editForm.securityDeposit} onChange={e => setEditForm(f => ({ ...f, securityDeposit: e.target.value }))} />
                                </Field>
                                <Field label="Lease end date" hint="Blank = month-to-month">
                                  <input type="date" style={inputStyle} value={editForm.leaseEndDate} onChange={e => setEditForm(f => ({ ...f, leaseEndDate: e.target.value }))} />
                                </Field>
                                <Field label="# of occupants">
                                  <input type="number" min="1" style={inputStyle} value={editForm.occupantCount} onChange={e => setEditForm(f => ({ ...f, occupantCount: e.target.value }))} />
                                </Field>
                                <Field label="Emergency contact name">
                                  <input style={inputStyle} value={editForm.emergencyContactName} onChange={e => setEditForm(f => ({ ...f, emergencyContactName: e.target.value }))} placeholder="optional" />
                                </Field>
                                <Field label="Emergency contact phone">
                                  <input style={inputStyle} value={editForm.emergencyContactPhone} onChange={e => setEditForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} placeholder="optional" />
                                </Field>
                              </>
                            ) : (
                              <>
                                <Field label="Shares">
                                  <input type="number" style={inputStyle} value={editForm.shareCount} onChange={e => setEditForm(f => ({ ...f, shareCount: e.target.value }))} />
                                </Field>
                                <Field label="Amount paid ($)">
                                  <input type="number" style={inputStyle} value={editForm.amountPaid} onChange={e => setEditForm(f => ({ ...f, amountPaid: e.target.value }))} />
                                </Field>
                              </>
                            )}
                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Notes">
                                <input style={inputStyle} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="optional" />
                              </Field>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", alignItems: "center" }}>
                            <button className="btn btn--primary btn--sm" disabled={savingEdit} onClick={() => saveEdit(s.id)}>
                              {savingEdit ? "Saving…" : "Save"}
                            </button>
                            <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>Cancel</button>
                            {editError && <span style={{ fontSize: "0.78rem", color: "#e07070" }}>{editError}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Governance ──────────────────────────────────────────────────────────

function GovernanceTab({ project, onSave }: { project: Project; onSave: (data: Partial<Project>) => Promise<void> }) {
  const [form, setForm] = useState({
    quorumPct: project.quorumPct.toString(), simpleThreshold: project.simpleThreshold.toString(),
    superThreshold: project.superThreshold.toString(), meetingCadence: project.meetingCadence,
    disputeProcess: project.disputeProcess,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    await onSave({ quorumPct: parseFloat(form.quorumPct), simpleThreshold: parseFloat(form.simpleThreshold), superThreshold: parseFloat(form.superThreshold), meetingCadence: form.meetingCadence, disputeProcess: form.disputeProcess });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div className="card" style={{ padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--color-dome-gold)", fontWeight: 600, marginBottom: "0.4rem" }}>One person, one vote</p>
        <p style={{ fontSize: "0.85rem" }}>This is locked — voting power never scales with share count. Every shareholder has one equal vote, regardless of how many shares they hold.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "560px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <Field label="Quorum (%)" hint="Minimum attendance for a valid vote">
            <input type="number" min="1" max="100" style={inputStyle} value={form.quorumPct} onChange={e => set("quorumPct", e.target.value)} />
          </Field>
          <Field label="Simple majority (%)" hint="Day-to-day decisions">
            <input type="number" min="1" max="100" style={inputStyle} value={form.simpleThreshold} onChange={e => set("simpleThreshold", e.target.value)} />
          </Field>
          <Field label="Supermajority (%)" hint="Major decisions — sale, large expenses, new members">
            <input type="number" min="1" max="100" style={inputStyle} value={form.superThreshold} onChange={e => set("superThreshold", e.target.value)} />
          </Field>
        </div>
        <Field label="Meeting cadence">
          <select style={inputStyle} value={form.meetingCadence} onChange={e => set("meetingCadence", e.target.value)}>
            {["Weekly", "Bi-weekly", "Monthly", "Quarterly"].map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Dispute resolution process">
          <textarea style={{ ...inputStyle, minHeight: "80px" }} value={form.disputeProcess} onChange={e => set("disputeProcess", e.target.value)} />
        </Field>
      </div>

      {/* Decision matrix */}
      <div>
        <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>Decision matrix</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[
            { type: "Simple majority", threshold: `${form.simpleThreshold}%`, examples: "House rules, maintenance scheduling, meeting agenda, minor purchases" },
            { type: "Supermajority", threshold: `${form.superThreshold}%`, examples: "New members, capital expenditures, renovation projects, sale of property" },
            { type: "Unanimous (recommended)", threshold: "100%", examples: "Dissolution, fundamental changes to governance structure" },
          ].map(row => (
            <div key={row.type} style={{ display: "flex", gap: "1rem", padding: "0.75rem 1rem", background: "var(--color-surface)", borderRadius: "6px", border: "1px solid var(--color-border)", alignItems: "flex-start" }}>
              <div style={{ minWidth: "160px" }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-limestone)" }}>{row.type}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--color-dome-gold)" }}>{row.threshold}</p>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>{row.examples}</p>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn--primary" style={{ alignSelf: "flex-start" }} onClick={save} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save governance"}
      </button>
    </div>
  );
}

// ─── Tab: Treasury ────────────────────────────────────────────────────────────

function TreasuryTab({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const [entries, setEntries] = useState<TreasuryEntry[]>(project.treasuryEntries);
  const [votes, setVotes] = useState<TreasuryVote[]>(project.treasuryVotes);
  const [entryForm, setEntryForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "INCOME", category: "", description: "", amount: "" });
  const [voteForm, setVoteForm] = useState({ periodLabel: "", surplus: "", decision: "distribute", amountDistributed: "", notes: "" });
  const [addingEntry, setAddingEntry] = useState(false);
  const [addingVote, setAddingVote] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [activeSection, setActiveSection] = useState<"ledger" | "votes">("ledger");

  const totalIncome = entries.filter(e => e.type === "INCOME").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "EXPENSE").reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpense;

  const INCOME_CATS = ["Rent", "Share sale", "Grant", "Donation", "Interest", "Other income"];
  const EXPENSE_CATS = ["Property tax", "Insurance", "Maintenance", "Utilities", "Management", "Legal", "Rainy-day fund", "Distribution", "Other expense"];

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setAddingEntry(true);
    const res = await fetch(`/api/housing/projects/${project.id}/treasury`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entryForm, amount: parseFloat(entryForm.amount) }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries(prev => [entry, ...prev]);
      setEntryForm({ date: new Date().toISOString().slice(0, 10), type: "INCOME", category: "", description: "", amount: "" });
      setShowEntryForm(false); onRefresh();
    }
    setAddingEntry(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/housing/projects/${project.id}/treasury`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: id }),
    });
    if (res.ok) { setEntries(prev => prev.filter(e => e.id !== id)); onRefresh(); }
  }

  async function addVote(e: React.FormEvent) {
    e.preventDefault();
    setAddingVote(true);
    const res = await fetch(`/api/housing/projects/${project.id}/votes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...voteForm, surplus: parseFloat(voteForm.surplus), amountDistributed: parseFloat(voteForm.amountDistributed || "0") }),
    });
    if (res.ok) {
      const vote = await res.json();
      setVotes(prev => [vote, ...prev]);
      setVoteForm({ periodLabel: "", surplus: "", decision: "distribute", amountDistributed: "", notes: "" });
      setShowVoteForm(false);
    }
    setAddingVote(false);
  }

  async function deleteVote(id: string) {
    if (!confirm("Delete this vote record?")) return;
    const res = await fetch(`/api/housing/projects/${project.id}/votes`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voteId: id }),
    });
    if (res.ok) setVotes(prev => prev.filter(v => v.id !== id));
  }

  const setEF = (k: string, v: string) => setEntryForm(f => ({ ...f, [k]: v }));
  const setVF = (k: string, v: string) => setVoteForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
        <StatChip label="Total income" value={`$${totalIncome.toLocaleString()}`} accent />
        <StatChip label="Total expenses" value={`$${totalExpense.toLocaleString()}`} />
        <StatChip label="Net position" value={`${net >= 0 ? "+" : ""}$${net.toLocaleString()}`} accent={net >= 0} />
        <StatChip label="Ledger entries" value={entries.length.toString()} />
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeSection === "ledger" ? "active" : ""}`} onClick={() => setActiveSection("ledger")}>Ledger</button>
        <button className={`tab-btn ${activeSection === "votes" ? "active" : ""}`} onClick={() => setActiveSection("votes")}>Surplus votes ({votes.length})</button>
      </div>

      {activeSection === "ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button className="btn btn--secondary btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowEntryForm(v => !v)}>+ Add entry</button>

          {showEntryForm && (
            <form onSubmit={addEntry} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "560px", padding: "1.25rem", background: "var(--color-surface)", borderRadius: "10px", border: "1px solid var(--color-border-strong)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="Date"><input type="date" style={inputStyle} required value={entryForm.date} onChange={e => setEF("date", e.target.value)} /></Field>
                <Field label="Type">
                  <select style={inputStyle} value={entryForm.type} onChange={e => setEF("type", e.target.value)}>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select style={inputStyle} value={entryForm.category} onChange={e => setEF("category", e.target.value)} required>
                    <option value="">Select…</option>
                    {(entryForm.type === "INCOME" ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Amount ($)"><input type="number" style={inputStyle} required min="0" step="0.01" value={entryForm.amount} onChange={e => setEF("amount", e.target.value)} /></Field>
              </div>
              <Field label="Description (optional)"><input style={inputStyle} value={entryForm.description} onChange={e => setEF("description", e.target.value)} placeholder="e.g. May rent from tenant" /></Field>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="btn btn--primary btn--sm" disabled={addingEntry}>{addingEntry ? "Saving…" : "Add entry"}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowEntryForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {entries.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="ll-table">
                <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th></th></tr></thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(e.date).toLocaleDateString()}</td>
                      <td><span className={`badge ${e.type === "INCOME" ? "badge--teal" : "badge--danger"}`}>{e.type === "INCOME" ? "Income" : "Expense"}</span></td>
                      <td>{e.category}</td>
                      <td style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{e.description ?? "—"}</td>
                      <td style={{ fontWeight: 600, color: e.type === "INCOME" ? "var(--color-teal-accent)" : "#e07070" }}>
                        {e.type === "INCOME" ? "+" : "−"}${e.amount.toLocaleString()}
                      </td>
                      <td><button onClick={() => deleteEntry(e.id)} className="btn btn--danger btn--sm">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>No ledger entries yet. Add your first income or expense entry above.</p>
          )}
        </div>
      )}

      {activeSection === "votes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button className="btn btn--secondary btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowVoteForm(v => !v)}>+ Record surplus vote</button>

          {showVoteForm && (
            <form onSubmit={addVote} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "560px", padding: "1.25rem", background: "var(--color-surface)", borderRadius: "10px", border: "1px solid var(--color-border-strong)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="Period" hint="e.g. May 2026"><input style={inputStyle} required value={voteForm.periodLabel} onChange={e => setVF("periodLabel", e.target.value)} placeholder="May 2026" /></Field>
                <Field label="Surplus available ($)"><input type="number" style={inputStyle} required min="0" step="0.01" value={voteForm.surplus} onChange={e => setVF("surplus", e.target.value)} /></Field>
                <Field label="Decision">
                  <select style={inputStyle} value={voteForm.decision} onChange={e => setVF("decision", e.target.value)}>
                    <option value="distribute">Distribute to shareholders</option>
                    <option value="reinvest">Reinvest in property</option>
                    <option value="reserve">Hold in reserve</option>
                    <option value="other">Other (see notes)</option>
                  </select>
                </Field>
                <Field label="Amount distributed ($)"><input type="number" style={inputStyle} min="0" step="0.01" value={voteForm.amountDistributed} onChange={e => setVF("amountDistributed", e.target.value)} placeholder="0" /></Field>
              </div>
              <Field label="Notes"><input style={inputStyle} value={voteForm.notes} onChange={e => setVF("notes", e.target.value)} placeholder="What was decided and how the vote went" /></Field>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="btn btn--primary btn--sm" disabled={addingVote}>{addingVote ? "Saving…" : "Record vote"}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowVoteForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {votes.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {votes.map(v => (
                <div key={v.id} className="card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <strong style={{ color: "var(--color-limestone)" }}>{v.periodLabel}</strong>
                      <span className="badge badge--gold">{v.decision}</span>
                    </div>
                    <p style={{ fontSize: "0.85rem" }}>Surplus: <strong style={{ color: "var(--color-dome-gold)" }}>${v.surplus.toLocaleString()}</strong> · Distributed: <strong>${v.amountDistributed.toLocaleString()}</strong></p>
                    {v.notes && <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{v.notes}</p>}
                  </div>
                  <button onClick={() => deleteVote(v.id)} className="btn btn--danger btn--sm" style={{ flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>No surplus votes recorded yet. After each meeting where the surplus is voted on, record it here.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

const HOUSING_DOCS = [
  { slug: "offering-memo", title: "Share Offering Memorandum", desc: "Plain-language document describing the deal to potential shareholders — property, shares, terms, and how to participate." },
  { slug: "shareholder-agreement", title: "Shareholder Agreement", desc: "The agreement each shareholder signs — rights, voting, transfer rules, exit terms, and dispute resolution." },
  { slug: "bylaws", title: "Governance & Bylaws", desc: "How the community governs the property — meeting rules, voting thresholds, treasury process, and amendments." },
  { slug: "treasury-report", title: "Treasury Report", desc: "Open-books financial statement — income, expenses, surplus, and a record of how each vote went." },
];

function DocumentsTab({ project }: { project: Project }) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const [generatingLease, setGeneratingLease] = useState<string | null>(null);
  const [leaseContent, setLeaseContent] = useState<Record<string, string>>({});

  async function generate(slug: string) {
    setGenerating(slug);
    const res = await fetch(`/api/housing/documents/${project.id}/${slug}`);
    if (res.ok) {
      const data = await res.json();
      setContent(prev => ({ ...prev, [slug]: data.content }));
    }
    setGenerating(null);
  }

  async function generateLease(shareholderId: string) {
    setGeneratingLease(shareholderId);
    const res = await fetch(`/api/housing/documents/${project.id}/lease?shareholderId=${shareholderId}`);
    if (res.ok) {
      const data = await res.json();
      setLeaseContent(prev => ({ ...prev, [shareholderId]: data.content }));
    }
    setGeneratingLease(null);
  }

  function download(slug: string, title: string) {
    const blob = new Blob([content[slug]], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.name} — ${title}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadLease(shareholderId: string, name: string) {
    const blob = new Blob([leaseContent[shareholderId]], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.name} — Lease — ${name}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  const renters = project.shareholders.filter(s => s.isRenter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p style={{ maxWidth: "560px" }}>
        Each document is generated from your project data using AI and formatted in plain language. Fill in the Property, Offering, Shareholders, and Governance tabs first for the best output.
      </p>
      {HOUSING_DOCS.map(doc => (
        <div key={doc.slug} className="card--raised" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.25rem" }}>{doc.title}</p>
              <p style={{ fontSize: "0.85rem" }}>{doc.desc}</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              {content[doc.slug] && (
                <button className="btn btn--ghost btn--sm" onClick={() => download(doc.slug, doc.title)}>Download .md</button>
              )}
              <button
                className="btn btn--primary btn--sm"
                onClick={() => generate(doc.slug)}
                disabled={generating === doc.slug}
              >
                {generating === doc.slug ? "Generating…" : content[doc.slug] ? "Regenerate" : "Generate"}
              </button>
            </div>
          </div>
          {content[doc.slug] && (
            <div style={{ background: "var(--color-surface)", borderRadius: "8px", padding: "1.25rem", border: "1px solid var(--color-border)", maxHeight: "400px", overflowY: "auto" }}>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>{content[doc.slug]}</pre>
            </div>
          )}
        </div>
      ))}

      {/* Lease Agreements */}
      {renters.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>Lease Agreements</p>
            <p style={{ fontSize: "0.85rem", maxWidth: "560px" }}>Generated per renter from their lease terms, the property details, and the cooperative governance structure.</p>
          </div>
          {renters.map(renter => (
            <div key={renter.id} className="card--raised" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.25rem" }}>Lease — {renter.name}</p>
                  <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                    {renter.monthlyRentPaid ? `$${renter.monthlyRentPaid}/mo` : "Rent TBD"}
                    {renter.moveInDate && ` · From ${new Date(renter.moveInDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                    {renter.leaseEndDate ? ` · Through ${new Date(renter.leaseEndDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : " · Month-to-month"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {leaseContent[renter.id] && (
                    <button className="btn btn--ghost btn--sm" onClick={() => downloadLease(renter.id, renter.name)}>Download .md</button>
                  )}
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => generateLease(renter.id)}
                    disabled={generatingLease === renter.id}
                  >
                    {generatingLease === renter.id ? "Generating…" : leaseContent[renter.id] ? "Regenerate" : "Generate Lease"}
                  </button>
                </div>
              </div>
              {leaseContent[renter.id] && (
                <div style={{ background: "var(--color-surface)", borderRadius: "8px", padding: "1.25rem", border: "1px solid var(--color-border)", maxHeight: "400px", overflowY: "auto" }}>
                  <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>{leaseContent[renter.id]}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Workbook Page ───────────────────────────────────────────────────────

export default function ProjectWorkbook({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Property");

  const load = useCallback(async () => {
    const res = await fetch(`/api/housing/projects/${id}`);
    if (res.status === 401) { router.push("/login"); return; }
    if (res.status === 404) { router.push("/housing/projects"); return; }
    if (res.ok) setProject(await res.json());
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function save(data: Partial<Project>) {
    const res = await fetch(`/api/housing/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(p => p ? { ...p, ...updated } : p);
    }
  }

  if (loading) return <div style={{ padding: "3rem", color: "var(--color-text-muted)" }}>Loading…</div>;
  if (!project) return null;

  const { totalRaise, publicShares, issuePrice } = dealMath(project);
  const { net } = treasuryMath(project);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div>
        <Link href="/housing/projects" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>&larr; My Projects</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>{project.name}</h1>
          <span className="badge badge--muted">{project.status.charAt(0) + project.status.slice(1).toLowerCase()}</span>
        </div>
        {project.address && <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>{project.address}</p>}

        {/* Quick stats bar */}
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
          {totalRaise > 0 && <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Raise: <strong style={{ color: "var(--color-limestone)" }}>${totalRaise.toLocaleString()}</strong></span>}
          {issuePrice > 0 && <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Issue price: <strong style={{ color: "var(--color-dome-gold)" }}>${issuePrice.toFixed(2)}</strong></span>}
          {publicShares > 0 && <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Public shares: <strong style={{ color: "var(--color-limestone)" }}>{publicShares.toLocaleString()}</strong></span>}
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Treasury: <strong style={{ color: net >= 0 ? "var(--color-teal-accent)" : "#e07070" }}>{net >= 0 ? "+" : ""}${net.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Tab nav */}
      <div className="tabs">
        {TABS.map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "Property" && <PropertyTab project={project} onSave={save} />}
        {activeTab === "Offering" && <OfferingTab project={project} onSave={save} />}
        {activeTab === "Shareholders" && <ShareholdersTab project={project} onRefresh={load} />}
        {activeTab === "Governance" && <GovernanceTab project={project} onSave={save} />}
        {activeTab === "Treasury" && <TreasuryTab project={project} onRefresh={load} />}
        {activeTab === "Documents" && <DocumentsTab project={project} />}
        {activeTab === "Proposals" && <ProposalsPanel entityType="HOUSING" entityId={project.id} />}
      </div>
    </div>
  );
}

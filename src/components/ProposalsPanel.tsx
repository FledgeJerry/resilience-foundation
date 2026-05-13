"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ProposalStatus = "DRAFT" | "OPEN" | "CLOSED" | "PASSED" | "FAILED" | "WITHDRAWN";

type ProposalSummary = {
  id: string;
  title: string;
  status: ProposalStatus;
  threshold: number;
  deadline: string | null;
  proposedBy: { id: string; name: string | null };
  _count: { votes: number };
  offchainYes: number;
  offchainNo: number;
  offchainAbstain: number;
  createdAt: string;
};

const STATUS_COLOR: Record<ProposalStatus, string> = {
  DRAFT: "badge--muted",
  OPEN: "badge--blue",
  CLOSED: "badge--muted",
  PASSED: "badge--teal",
  FAILED: "badge--danger",
  WITHDRAWN: "badge--muted",
};

const STATUS_ORDER: ProposalStatus[] = ["OPEN", "DRAFT", "PASSED", "FAILED", "WITHDRAWN", "CLOSED"];

type Props = {
  entityType: "COOP" | "HOUSING";
  entityId: string;
};

export default function ProposalsPanel({ entityType, entityId }: Props) {
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", threshold: "51", deadline: "" });

  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/proposals?entityType=${entityType}&entityId=${entityId}`)
      .then(r => r.ok ? r.json() : [])
      .then(setProposals)
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, title: form.title, body: form.body, threshold: Number(form.threshold), deadline: form.deadline || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data?.error ?? `Error ${res.status}`);
      } else {
        setProposals(prev => [{ ...data, _count: { votes: 0 }, offchainYes: 0, offchainNo: 0, offchainAbstain: 0 }, ...prev]);
        setForm({ title: "", body: "", threshold: "51", deadline: "" });
        setShowForm(false);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Network error");
    }
    setCreating(false);
  }

  const sorted = [...proposals].sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  const inputSt: React.CSSProperties = {
    width: "100%",
    background: "var(--color-surface-raised)",
    border: "1px solid var(--color-border-strong)",
    borderRadius: "6px",
    padding: "0.6rem 0.875rem",
    color: "var(--color-limestone)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.95rem",
    outline: "none",
  };

  if (loading) return <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Loading proposals…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Proposals</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            Draft → Publish → Vote → Close and tally
          </p>
        </div>
        <button className="btn btn--sm btn--primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? "Cancel" : "+ New proposal"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={create}
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.4rem" }}>
              Title <span style={{ color: "var(--color-dome-gold)" }}>*</span>
            </label>
            <input style={inputSt} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What are you proposing?" required />
          </div>
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.4rem" }}>
              Description <span style={{ color: "var(--color-dome-gold)" }}>*</span>
            </label>
            <textarea
              style={{ ...inputSt, minHeight: "100px", resize: "vertical" }}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Explain the proposal — what, why, and any relevant details. Be specific."
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                Pass threshold (% yes)
              </label>
              <select style={inputSt} value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}>
                <option value="51">Simple majority — 51%</option>
                <option value="67">Two-thirds — 67%</option>
                <option value="75">Supermajority — 75%</option>
                <option value="100">Unanimous — 100%</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                Voting deadline (optional)
              </label>
              <input type="date" style={inputSt} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          {createError && (
            <p style={{ fontSize: "0.82rem", color: "#e07070", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: "6px", padding: "0.5rem 0.75rem" }}>
              {createError}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={creating}>
              {creating ? "Creating…" : "Save as draft"}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setShowForm(false); setCreateError(null); }}>Cancel</button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            Proposals start as drafts. You publish when ready — that&apos;s when members can vote.
          </p>
        </form>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          No proposals yet. Any member can create one.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sorted.map(p => {
            const totalVotes = p._count.votes + p.offchainYes + p.offchainNo + p.offchainAbstain;
            const isPast = ["PASSED", "FAILED", "WITHDRAWN", "CLOSED"].includes(p.status);
            return (
              <Link
                key={p.id}
                href={`/proposals/${p.id}`}
                style={{ display: "block", textDecoration: "none" }}
              >
                <div style={{
                  background: "var(--color-surface)",
                  border: `1px solid ${p.status === "OPEN" ? "rgba(46,109,164,0.35)" : "var(--color-border)"}`,
                  borderRadius: "8px",
                  padding: "1rem 1.25rem",
                  transition: "border-color 0.15s, background 0.15s",
                  opacity: isPast ? 0.7 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.4rem" }}>
                    <p style={{ fontWeight: 700, color: "var(--color-limestone)", fontSize: "0.95rem", lineHeight: 1.3 }}>{p.title}</p>
                    <span className={`badge ${STATUS_COLOR[p.status]}`} style={{ flexShrink: 0 }}>{p.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem", color: "var(--color-text-muted)", flexWrap: "wrap" }}>
                    <span>By {p.proposedBy.name ?? "Unknown"}</span>
                    <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
                    <span>Passes at {p.threshold}%</span>
                    {p.deadline && <span>Deadline {new Date(p.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                    {p.status === "OPEN" && <span style={{ color: "var(--color-river-blue)", fontWeight: 600 }}>Voting open →</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type VoteChoice = "YES" | "NO" | "ABSTAIN";
type ProposalStatus = "DRAFT" | "OPEN" | "CLOSED" | "PASSED" | "FAILED" | "WITHDRAWN";

type Vote = {
  id: string;
  choice: VoteChoice;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string | null };
};

type Proposal = {
  id: string;
  entityType: "COOP" | "HOUSING";
  entityId: string;
  title: string;
  body: string;
  status: ProposalStatus;
  threshold: number;
  deadline: string | null;
  offchainYes: number;
  offchainNo: number;
  offchainAbstain: number;
  proposedBy: { id: string; name: string | null };
  votes: Vote[];
  currentUserId: string;
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

const CHOICE_COLOR: Record<VoteChoice, string> = {
  YES: "var(--color-teal-accent)",
  NO: "#e07070",
  ABSTAIN: "var(--color-text-muted)",
};

function VoteTally({ proposal }: { proposal: Proposal }) {
  const yes = proposal.votes.filter(v => v.choice === "YES").length + proposal.offchainYes;
  const no = proposal.votes.filter(v => v.choice === "NO").length + proposal.offchainNo;
  const abstain = proposal.votes.filter(v => v.choice === "ABSTAIN").length + proposal.offchainAbstain;
  const total = yes + no + abstain;
  const decisive = yes + no;
  const yesPct = decisive > 0 ? (yes / decisive) * 100 : 0;
  const passing = yesPct >= proposal.threshold;

  return (
    <div className="proposal-tally">
      <div className="proposal-tally__bar">
        <div className="proposal-tally__segment proposal-tally__segment--yes" style={{ flex: yes || 0.001 }} title={`${yes} Yes`} />
        <div className="proposal-tally__segment proposal-tally__segment--abstain" style={{ flex: abstain || 0.001 }} title={`${abstain} Abstain`} />
        <div className="proposal-tally__segment proposal-tally__segment--no" style={{ flex: no || 0.001 }} title={`${no} No`} />
      </div>

      <div className="proposal-tally__counts">
        <span style={{ color: "var(--color-teal-accent)" }}><strong>{yes}</strong> Yes</span>
        <span style={{ color: "var(--color-text-muted)" }}><strong>{abstain}</strong> Abstain</span>
        <span style={{ color: "#e07070" }}><strong>{no}</strong> No</span>
        <span style={{ color: "var(--color-text-muted)", marginLeft: "auto" }}>{total} vote{total !== 1 ? "s" : ""} cast</span>
      </div>

      {decisive > 0 && (
        <div className="proposal-tally__result">
          <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
            {yesPct.toFixed(0)}% yes of yes+no votes
            {" · "}threshold: {proposal.threshold}%
          </span>
          <span className={`badge ${passing ? "badge--teal" : proposal.status === "OPEN" ? "badge--blue" : "badge--danger"}`}>
            {proposal.status === "OPEN" ? (passing ? "On track to pass" : "On track to fail") : (passing ? "Passed" : "Failed")}
          </span>
        </div>
      )}

      {(proposal.offchainYes > 0 || proposal.offchainNo > 0 || proposal.offchainAbstain > 0) && (
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
          Includes {proposal.offchainYes + proposal.offchainNo + proposal.offchainAbstain} off-chain (meeting) votes
        </p>
      )}
    </div>
  );
}

export default function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [myChoice, setMyChoice] = useState<VoteChoice | null>(null);
  const [comment, setComment] = useState("");
  const [voting, setVoting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [offchainForm, setOffchainForm] = useState({ yes: "", no: "", abstain: "" });
  const [showOffchain, setShowOffchain] = useState(false);
  const [offchainSaving, setOffchainSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", body: "", threshold: "", deadline: "" });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then(r => {
        if (r.status === 401) { router.push("/login"); return null; }
        if (!r.ok) { router.back(); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setProposal(data);
        const myVote = data.votes.find((v: Vote) => v.user.id === data.currentUserId);
        if (myVote) { setMyChoice(myVote.choice); setComment(myVote.comment ?? ""); }
        setEditForm({ title: data.title, body: data.body, threshold: data.threshold.toString(), deadline: data.deadline ? data.deadline.slice(0, 10) : "" });
        setOffchainForm({ yes: data.offchainYes.toString(), no: data.offchainNo.toString(), abstain: data.offchainAbstain.toString() });
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function castVote(choice: VoteChoice) {
    if (!proposal) return;
    setVoting(true);
    const res = await fetch(`/api/proposals/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice, comment }),
    });
    if (res.ok) {
      const vote = await res.json();
      setMyChoice(choice);
      setProposal(p => p ? {
        ...p,
        votes: p.votes.some(v => v.user.id === p.currentUserId)
          ? p.votes.map(v => v.user.id === p.currentUserId ? { ...v, choice, comment: comment || null } : v)
          : [...p.votes, vote],
      } : p);
    }
    setVoting(false);
  }

  async function retractVote() {
    await fetch(`/api/proposals/${id}/vote`, { method: "DELETE" });
    setMyChoice(null);
    setProposal(p => p ? { ...p, votes: p.votes.filter(v => v.user.id !== p.currentUserId) } : p);
  }

  async function changeStatus(action: "open" | "close" | "withdraw") {
    setStatusBusy(true);
    const res = await fetch(`/api/proposals/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProposal(p => p ? { ...p, status: updated.status } : p);
    }
    setStatusBusy(false);
  }

  async function saveOffchain() {
    setOffchainSaving(true);
    const res = await fetch(`/api/proposals/${id}/offchain`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offchainYes: Number(offchainForm.yes), offchainNo: Number(offchainForm.no), offchainAbstain: Number(offchainForm.abstain) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProposal(p => p ? { ...p, ...updated } : p);
      setShowOffchain(false);
    }
    setOffchainSaving(false);
  }

  async function saveEdit() {
    setEditSaving(true);
    const res = await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editForm.title, body: editForm.body, threshold: Number(editForm.threshold), deadline: editForm.deadline || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProposal(p => p ? { ...p, ...updated } : p);
      setEditing(false);
    }
    setEditSaving(false);
  }

  if (loading) return <main className="container"><p className="loading-text">Loading…</p></main>;
  if (!proposal) return null;

  const isProposer = proposal.currentUserId === proposal.proposedBy.id;
  const canVote = proposal.status === "OPEN";
  const backHref = proposal.entityType === "HOUSING"
    ? `/housing/project/${proposal.entityId}`
    : `/handbook`;

  return (
    <main className="container proposal-detail">
      <div className="proposal-detail__inner">
        {/* Back */}
        <Link href={backHref} className="back-link">
          ← Back to {proposal.entityType === "HOUSING" ? "project" : "handbook"}
        </Link>

        {/* Header */}
        <div className="proposal-detail__header">
          <div style={{ flex: 1 }}>
            {editing ? (
              <input
                className="proposal-edit-title"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              />
            ) : (
              <h1 className="proposal-detail__title">{proposal.title}</h1>
            )}
            <div className="proposal-detail__meta">
              <span className={`badge ${STATUS_COLOR[proposal.status]}`}>{proposal.status}</span>
              <span>Proposed by {proposal.proposedBy.name ?? "Unknown"}</span>
              {proposal.deadline && (
                <span>Deadline: {new Date(proposal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              )}
            </div>
          </div>

          {/* Proposer controls */}
          {isProposer && !editing && (
            <div className="proposal-actions">
              {proposal.status === "DRAFT" && (
                <>
                  <button className="btn btn--sm btn--ghost" onClick={() => setEditing(true)}>Edit</button>
                  <button className="btn btn--sm btn--primary" onClick={() => changeStatus("open")} disabled={statusBusy}>Publish</button>
                  <button className="btn btn--sm btn--danger" onClick={() => changeStatus("withdraw")} disabled={statusBusy}>Withdraw</button>
                </>
              )}
              {proposal.status === "OPEN" && (
                <>
                  <button className="btn btn--sm btn--primary" onClick={() => changeStatus("close")} disabled={statusBusy}>Close &amp; tally</button>
                  <button className="btn btn--sm btn--danger" onClick={() => changeStatus("withdraw")} disabled={statusBusy}>Withdraw</button>
                </>
              )}
            </div>
          )}
          {editing && (
            <div className="proposal-actions">
              <button className="btn btn--sm btn--primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Saving…" : "Save"}</button>
              <button className="btn btn--sm btn--ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="proposal-body">
          {editing ? (
            <textarea
              className="proposal-edit-body"
              value={editForm.body}
              onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
              rows={8}
            />
          ) : (
            <div className="proposal-body__text">
              {proposal.body.split("\n").map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))}
            </div>
          )}
          {editing && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
              <label style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                Pass threshold (% yes of yes+no)
                <input type="number" min="1" max="100" value={editForm.threshold} onChange={e => setEditForm(f => ({ ...f, threshold: e.target.value }))} style={{ padding: "0.5rem 0.75rem", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "6px", color: "var(--color-limestone)", fontFamily: "var(--font-sans)" }} />
              </label>
              <label style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                Deadline (optional)
                <input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} style={{ padding: "0.5rem 0.75rem", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "6px", color: "var(--color-limestone)", fontFamily: "var(--font-sans)" }} />
              </label>
            </div>
          )}
        </div>

        {/* Tally */}
        <VoteTally proposal={proposal} />

        {/* Vote form */}
        {canVote && (
          <div className="vote-form">
            <h2 className="vote-form__heading">Cast your vote</h2>
            {myChoice && (
              <p className="vote-form__current">
                Your current vote: <strong style={{ color: CHOICE_COLOR[myChoice] }}>{myChoice}</strong>
                {" · "}
                <button className="link-button" onClick={retractVote}>Retract</button>
              </p>
            )}
            <div className="vote-form__choices">
              {(["YES", "NO", "ABSTAIN"] as VoteChoice[]).map(c => (
                <button
                  key={c}
                  className={`vote-btn vote-btn--${c.toLowerCase()}${myChoice === c ? " active" : ""}`}
                  onClick={() => castVote(c)}
                  disabled={voting}
                >
                  {c === "YES" ? "✓ Yes" : c === "NO" ? "✗ No" : "— Abstain"}
                </button>
              ))}
            </div>
            <label style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.75rem" }}>
              Comment (optional)
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Add context to your vote…"
                style={{ padding: "0.6rem 0.875rem", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "6px", color: "var(--color-limestone)", fontFamily: "var(--font-sans)", fontSize: "0.9rem", resize: "vertical" }}
              />
            </label>
          </div>
        )}

        {/* Off-chain vote recorder */}
        {canVote && (
          <div className="offchain-section">
            <button className="btn btn--ghost btn--sm" onClick={() => setShowOffchain(v => !v)}>
              {showOffchain ? "Hide" : "Record meeting / in-person votes"}
            </button>
            {showOffchain && (
              <div className="offchain-form">
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
                  Use this to record votes cast at an in-person meeting for members without accounts.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  {(["yes", "no", "abstain"] as const).map(k => (
                    <label key={k} style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      Off-chain {k}
                      <input type="number" min="0" value={offchainForm[k]} onChange={e => setOffchainForm(f => ({ ...f, [k]: e.target.value }))} style={{ padding: "0.5rem 0.75rem", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "6px", color: "var(--color-limestone)", fontFamily: "var(--font-sans)" }} />
                    </label>
                  ))}
                </div>
                <button className="btn btn--primary btn--sm" style={{ marginTop: "0.75rem" }} onClick={saveOffchain} disabled={offchainSaving}>
                  {offchainSaving ? "Saving…" : "Save off-chain tally"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Votes list */}
        {proposal.votes.length > 0 && (
          <div className="votes-list">
            <h2 className="votes-list__heading">Votes ({proposal.votes.length})</h2>
            <div className="votes-list__items">
              {proposal.votes.map(v => (
                <div key={v.id} className="vote-item">
                  <span className={`vote-item__choice vote-item__choice--${v.choice.toLowerCase()}`}>
                    {v.choice === "YES" ? "✓" : v.choice === "NO" ? "✗" : "—"}
                  </span>
                  <div className="vote-item__body">
                    <span className="vote-item__name">{v.user.name ?? "Anonymous"}</span>
                    {v.comment && <p className="vote-item__comment">{v.comment}</p>}
                  </div>
                  <span className="vote-item__time">
                    {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

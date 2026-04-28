"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HANDBOOK } from "@/lib/handbook-content";
import type { HandbookField } from "@/lib/handbook-content";

type Coop = { id: string; name: string; role: string; isPublic?: boolean; website?: string; contactEmail?: string; phone?: string };
type Member = { id: string; role: string; user: { id: string; name: string | null; email: string } };
type Entries = Record<string, string>;
type SaveState = Record<string, "saving" | "saved" | "error">;

function HandbookPageInner() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewAsUserId = searchParams.get("userId");
  const viewAsName = searchParams.get("name");
  const isAdminView = !!viewAsUserId;

  const [coops, setCoops] = useState<Coop[]>([]);
  const [coopId, setCoopId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCoopName, setNewCoopName] = useState("");
  const [creating, setCreating] = useState(false);
  const [entries, setEntries] = useState<Entries>({});
  const [saveState, setSaveState] = useState<SaveState>({});
  const [activeSection, setActiveSection] = useState(HANDBOOK[0].id);
  const [showExample, setShowExample] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [showTeam, setShowTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteOfferEmail, setInviteOfferEmail] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);

  // Directory listing state
  const [showDirectory, setShowDirectory] = useState(false);
  const [dirPublic, setDirPublic] = useState(false);
  const [dirWebsite, setDirWebsite] = useState("");
  const [dirEmail, setDirEmail] = useState("");
  const [dirPhone, setDirPhone] = useState("");
  const [dirSaving, setDirSaving] = useState(false);
  const [dirSaved, setDirSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    const url = isAdminView ? `/api/coops?userId=${viewAsUserId}` : "/api/coops";
    fetch(url)
      .then((r) => r.json())
      .then((data: Coop[]) => {
        setCoops(data);
        if (data.length === 1) setCoopId(data[0].id);
        setLoading(false);
      });
  }, [status, router, isAdminView, viewAsUserId]);

  useEffect(() => {
    if (!coopId) return;
    setEntries({});
    setMembers([]);
    const handbookUrl = isAdminView
      ? `/api/handbook?coopId=${coopId}&userId=${viewAsUserId}`
      : `/api/handbook?coopId=${coopId}`;
    fetch(handbookUrl)
      .then((r) => r.json())
      .then((data: { fieldId: string; value: string }[]) => {
        const map: Entries = {};
        for (const e of data) map[e.fieldId] = e.value;
        setEntries(map);
      });
    if (!isAdminView) {
      fetch(`/api/coops/${coopId}/members`)
        .then((r) => r.json())
        .then((data: Member[]) => setMembers(data));
    }

    // Load current directory settings for this coop
    if (!isAdminView) {
      const coopData = coops.find((c) => c.id === coopId);
      if (coopData) {
        setDirPublic(coopData.isPublic ?? false);
        setDirWebsite(coopData.website ?? "");
        setDirEmail(coopData.contactEmail ?? "");
        setDirPhone(coopData.phone ?? "");
      }
    }
  }, [coopId, isAdminView, viewAsUserId, coops]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !coopId) return;
    setInviting(true);
    setInviteError("");
    setInviteOfferEmail(null);
    setInviteSent(false);
    const res = await fetch(`/api/coops/${coopId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 404) {
        setInviteOfferEmail(inviteEmail.trim());
      } else {
        setInviteError(data.error ?? "Something went wrong");
      }
    } else {
      setMembers((prev) => [...prev, data]);
      setInviteEmail("");
    }
    setInviting(false);
  }

  async function handleSendInvite() {
    if (!inviteOfferEmail) return;
    setInviting(true);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteOfferEmail }),
    });
    if (res.ok) {
      setInviteSent(true);
      setInviteOfferEmail(null);
      setInviteEmail("");
    } else {
      setInviteError("Failed to send invite");
      setInviteOfferEmail(null);
    }
    setInviting(false);
  }

  async function handleRemoveMember(memberId: string) {
    if (!coopId) return;
    await fetch(`/api/coops/${coopId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handleCreateCoop(e: React.FormEvent) {
    e.preventDefault();
    if (!newCoopName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/coops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCoopName }),
    });
    const coop: Coop = await res.json();
    setCoops((prev) => [...prev, coop]);
    setCoopId(coop.id);
    setShowCreate(false);
    setNewCoopName("");
    setCreating(false);
  }

  const save = useCallback(async (fieldId: string, value: string) => {
    if (!coopId || isAdminView) return;
    setSaveState((s) => ({ ...s, [fieldId]: "saving" }));
    try {
      await fetch("/api/handbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coopId, fieldId, value }),
      });
      setSaveState((s) => ({ ...s, [fieldId]: "saved" }));
      setTimeout(() => setSaveState((s) => { const n = { ...s }; delete n[fieldId]; return n; }), 2000);
    } catch {
      setSaveState((s) => ({ ...s, [fieldId]: "error" }));
    }
  }, [coopId, isAdminView]);

  async function saveDirectory() {
    if (!coopId) return;
    setDirSaving(true);
    setDirSaved(false);
    await fetch("/api/coops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coopId, isPublic: dirPublic, website: dirWebsite, contactEmail: dirEmail, phone: dirPhone }),
    });
    setDirSaving(false);
    setDirSaved(true);
    setTimeout(() => setDirSaved(false), 2500);
    setCoops((prev) => prev.map((c) => c.id === coopId
      ? { ...c, isPublic: dirPublic, website: dirWebsite, contactEmail: dirEmail, phone: dirPhone }
      : c
    ));
  }

  function handleChange(fieldId: string, value: string) {
    if (isAdminView) return;
    setEntries((e) => ({ ...e, [fieldId]: value }));
  }

  function handleBlur(fieldId: string) {
    if (isAdminView) return;
    save(fieldId, entries[fieldId] ?? "");
  }

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;

  // Create form — no coops yet, or user clicked "+ New" (not in admin view)
  if (!isAdminView && (coops.length === 0 || showCreate)) {
    return (
      <div style={{ maxWidth: "480px" }}>
        <span className="eyebrow">Get Started</span>
        <h1 style={{ marginBottom: "0.5rem" }}>Name your co-op</h1>
        <p style={{ marginBottom: "2rem", color: "var(--color-text-secondary)" }}>
          Give your co-op a working name — you can always change it later.
        </p>
        <form onSubmit={handleCreateCoop} style={{ display: "flex", gap: "0.75rem" }}>
          <input
            type="text"
            value={newCoopName}
            onChange={(e) => setNewCoopName(e.target.value)}
            placeholder="e.g. Neighbors Care Cooperative"
            style={{ flex: 1 }}
            autoFocus
          />
          <button type="submit" className="btn btn--primary" disabled={creating || !newCoopName.trim()}>
            {creating ? "Creating…" : "Start"}
          </button>
        </form>
        {coops.length > 0 && (
          <button
            onClick={() => setShowCreate(false)}
            style={{ marginTop: "1rem", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}
          >
            ← Back
          </button>
        )}
      </div>
    );
  }

  if (isAdminView && coops.length === 0) {
    return (
      <div>
        <Link href="/admin" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>← Back to users</Link>
        <p style={{ marginTop: "1rem", color: "var(--color-text-muted)" }}>This user has no co-ops yet.</p>
      </div>
    );
  }

  // Picker — multiple coops, none selected
  if (coops.length > 1 && !coopId) {
    return (
      <div style={{ maxWidth: "480px" }}>
        {isAdminView && (
          <Link href="/admin" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block", marginBottom: "1rem" }}>← Back to users</Link>
        )}
        <span className="eyebrow">{isAdminView ? `${viewAsName ?? "User"}'s Co-ops` : "Your Co-ops"}</span>
        <h1 style={{ marginBottom: "1.5rem" }}>Which handbook?</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {coops.map((c) => (
            <button
              key={c.id}
              onClick={() => setCoopId(c.id)}
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "1rem",
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <p style={{ fontWeight: 600, margin: 0 }}>{c.name}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0, textTransform: "lowercase" }}>{c.role}</p>
            </button>
          ))}
          {!isAdminView && (
            <button
              className="btn btn--secondary"
              onClick={() => setShowCreate(true)}
              style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
            >
              + New Co-op
            </button>
          )}
        </div>
      </div>
    );
  }

  // Handbook view
  const activeCoop = coops.find((c) => c.id === coopId);
  const section = HANDBOOK.find((s) => s.id === activeSection) ?? HANDBOOK[0];
  const completedInSection = section.fields.filter((f) => entries[f.id]?.trim()).length;

  return (
    <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>

      {/* Sidebar */}
      <aside style={{ width: "220px", flexShrink: 0, position: "sticky", top: "80px" }}>
        {isAdminView && (
          <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
            <Link href="/admin" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>← Back to users</Link>
            <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(232,200,74,0.08)", border: "1px solid rgba(232,200,74,0.25)", borderRadius: "6px" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-dome-gold)", margin: "0 0 0.1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin view</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", margin: 0 }}>{viewAsName ?? "User"} · read only</p>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
            Co-op
          </p>
          <p style={{ fontWeight: 600, fontSize: "0.85rem", margin: "0 0 0.25rem", color: "var(--color-limestone)" }}>
            {activeCoop?.name}
          </p>
          {!isAdminView && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {coops.length > 1 && (
                <button
                  onClick={() => setCoopId(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.75rem", padding: 0, fontFamily: "var(--font-sans)" }}
                >
                  Switch
                </button>
              )}
              <button
                onClick={() => setShowCreate(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.75rem", padding: 0, fontFamily: "var(--font-sans)" }}
              >
                + New
              </button>
              <button
                onClick={() => setShowTeam((v) => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.75rem", padding: 0, fontFamily: "var(--font-sans)" }}
              >
                Team
              </button>
            </div>
          )}

          {!isAdminView && showTeam && (
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {members.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, margin: 0, color: "var(--color-limestone)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.user.name ?? m.user.email}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", margin: 0, textTransform: "lowercase" }}>{m.role}</p>
                  </div>
                  {m.role !== "OWNER" && activeCoop?.role === "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.7rem", padding: 0, fontFamily: "var(--font-sans)", flexShrink: 0 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {activeCoop?.role === "OWNER" && (
                <form onSubmit={handleInvite} style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); setInviteOfferEmail(null); setInviteSent(false); }}
                    placeholder="Email address"
                    style={{ flex: 1, fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
                  />
                  <button type="submit" className="btn btn--primary btn--sm" disabled={inviting} style={{ fontSize: "0.7rem", padding: "0.3rem 0.6rem" }}>
                    {inviting ? "…" : "Add"}
                  </button>
                </form>
              )}
              {inviteError && <p style={{ fontSize: "0.72rem", color: "#e07070", margin: 0 }}>{inviteError}</p>}
              {inviteSent && <p style={{ fontSize: "0.72rem", color: "var(--color-teal-accent)", margin: 0 }}>Invite sent!</p>}
              {inviteOfferEmail && (
                <div style={{ background: "rgba(232,200,74,0.08)", border: "1px solid rgba(232,200,74,0.3)", borderRadius: "6px", padding: "0.6rem 0.75rem", marginTop: "0.25rem" }}>
                  <p style={{ fontSize: "0.72rem", color: "var(--color-limestone)", margin: "0 0 0.4rem", lineHeight: 1.4 }}>
                    No account for <strong>{inviteOfferEmail}</strong>. Send them an invite?
                  </p>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button onClick={handleSendInvite} disabled={inviting} className="btn btn--primary btn--sm" style={{ fontSize: "0.7rem", padding: "0.25rem 0.6rem" }}>
                      {inviting ? "Sending…" : "Send invite"}
                    </button>
                    <button onClick={() => { setInviteOfferEmail(null); setInviteEmail(""); }} className="btn btn--ghost btn--sm" style={{ fontSize: "0.7rem", padding: "0.25rem 0.6rem" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!isAdminView && activeCoop?.role === "OWNER" && (
          <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
            <button
              onClick={() => setShowDirectory((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.75rem", padding: 0, fontFamily: "var(--font-sans)" }}
            >
              {showDirectory ? "▾" : "▸"} Directory listing
            </button>
            {showDirectory && (
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={dirPublic}
                    onChange={(e) => setDirPublic(e.target.checked)}
                    style={{ width: "auto", margin: 0 }}
                  />
                  List in public directory
                </label>
                <input
                  type="url"
                  value={dirWebsite}
                  onChange={(e) => setDirWebsite(e.target.value)}
                  placeholder="Website"
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
                />
                <input
                  type="email"
                  value={dirEmail}
                  onChange={(e) => setDirEmail(e.target.value)}
                  placeholder="Contact email"
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
                />
                <input
                  type="tel"
                  value={dirPhone}
                  onChange={(e) => setDirPhone(e.target.value)}
                  placeholder="Phone"
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button onClick={saveDirectory} disabled={dirSaving} className="btn btn--primary btn--sm" style={{ fontSize: "0.7rem", padding: "0.3rem 0.6rem" }}>
                    {dirSaving ? "Saving…" : "Save"}
                  </button>
                  {dirSaved && <span style={{ fontSize: "0.72rem", color: "var(--color-teal-accent)" }}>Saved</span>}
                </div>
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
          Sections
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {HANDBOOK.map((s) => {
            const done = s.fields.filter((f) => entries[f.id]?.trim()).length;
            const isActive = s.id === activeSection;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  background: isActive ? "var(--color-surface-raised)" : "transparent",
                  border: isActive ? "1px solid var(--color-border-strong)" : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isActive ? "var(--color-dome-gold)" : "var(--color-text-muted)", display: "block" }}>
                  {s.id}
                </span>
                <span style={{ fontSize: "0.8rem", color: isActive ? "var(--color-limestone)" : "var(--color-text-secondary)", display: "block", lineHeight: 1.3 }}>
                  {s.title.split(":")[0]}
                </span>
                {s.title.includes(":") && (
                  <span style={{ fontSize: "0.72rem", color: isActive ? "var(--color-text-secondary)" : "var(--color-text-muted)", display: "block", lineHeight: 1.3 }}>
                    {s.title.split(":")[1].trim()}
                  </span>
                )}
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.2rem", display: "block" }}>
                  {done}/{s.fields.length} fields
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: "2rem" }}>
          <span className="eyebrow">{section.id}</span>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{section.title}</h1>
          <p style={{ marginBottom: "0.5rem" }}>{section.description}</p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            {completedInSection} of {section.fields.length} fields completed
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {section.fields.map((field: HandbookField) => (
            <div key={field.id} className="card" id={field.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                <span className="badge badge--gold">{field.id}</span>
                <span className={`badge ${field.type === "N" ? "badge--blue" : field.type === "select" ? "badge--blue" : "badge--teal"}`}>
                  {field.type === "N" ? "Narrative" : field.type === "select" ? "Select" : "Numeric"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Feeds into: {field.feedsInto.join(", ")}
                </span>
              </div>

              <label htmlFor={field.id} style={{ color: "var(--color-limestone)", fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", display: "block" }}>
                {field.question}
              </label>

              {field.type === "select" && field.options ? (() => {
                const current = entries[field.id] ?? "";
                const isOther = current.startsWith("Other: ") || (current === "Other");
                const selectVal = isOther ? "Other" : (field.options.includes(current) ? current : "");
                const otherText = isOther ? current.replace(/^Other: ?/, "") : "";
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <select
                      id={field.id}
                      value={selectVal}
                      disabled={isAdminView}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Other") {
                          handleChange(field.id, "Other");
                        } else {
                          handleChange(field.id, val);
                          setTimeout(() => save(field.id, val), 0);
                        }
                      }}
                    >
                      <option value="">Select an option…</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {isOther && (
                      <input
                        type="text"
                        value={otherText}
                        readOnly={isAdminView}
                        onChange={(e) => handleChange(field.id, e.target.value ? `Other: ${e.target.value}` : "Other")}
                        onBlur={() => handleBlur(field.id)}
                        placeholder="Describe your legal structure…"
                      />
                    )}
                  </div>
                );
              })() : field.multiline ? (
                <textarea
                  id={field.id}
                  value={entries[field.id] ?? ""}
                  readOnly={isAdminView}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  onBlur={() => handleBlur(field.id)}
                  placeholder={isAdminView ? "—" : "Your answer…"}
                  rows={4}
                />
              ) : (
                <input
                  id={field.id}
                  type="text"
                  value={entries[field.id] ?? ""}
                  readOnly={isAdminView}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  onBlur={() => handleBlur(field.id)}
                  placeholder={isAdminView ? "—" : "Your answer…"}
                />
              )}

              {!isAdminView && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowExample((s) => ({ ...s, [field.id]: !s[field.id] }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-sans)", padding: 0 }}
                  >
                    {showExample[field.id] ? "Hide example" : "Show example"}
                  </button>
                  {saveState[field.id] === "saving" && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Saving…</span>
                  )}
                  {saveState[field.id] === "saved" && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-teal-accent)" }}>Saved</span>
                  )}
                  {saveState[field.id] === "error" && (
                    <span style={{ fontSize: "0.75rem", color: "#e07070" }}>Error saving</span>
                  )}
                </div>
              )}

              {!isAdminView && showExample[field.id] && (
                <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "var(--color-surface-raised)", borderRadius: "6px", borderLeft: "3px solid var(--color-river-blue)" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-river-blue)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Neighbors Care Cooperative example
                  </p>
                  <p style={{ fontSize: "0.875rem", margin: 0 }}>{field.example}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HandbookPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <HandbookPageInner />
    </Suspense>
  );
}

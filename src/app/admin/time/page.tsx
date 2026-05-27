"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Business = { id: string; name: string };
type TimeLog = {
  id: string;
  date: string;
  quarter: string;
  category: string;
  hours: number;
  staffMember: string;
  notes: string | null;
  business: Business | null;
};

type SortCol = "date" | "quarter" | "category" | "hours" | "staffMember" | "entrepreneur";
type SortDir = "asc" | "desc";

const inp: React.CSSProperties = {
  background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)",
  borderRadius: "6px", padding: "0.4rem 0.6rem", color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)", fontSize: "0.8rem", outline: "none",
};

const CATEGORIES = ["", "EJ Meetup", "99 Problems but a Pitch Ain't One", "One on One Consulting", "Admin and Reporting", "TREK Meeting", "Other"];

function parsedName(log: TimeLog): string {
  if (log.business) return log.business.name;
  if (log.notes?.includes("(unmatched)")) return log.notes.replace(" (unmatched)", "");
  return "";
}

function isUnmatched(log: TimeLog): boolean {
  return !log.business && Boolean(log.notes?.includes("(unmatched)"));
}

function isAssignable(log: TimeLog): boolean {
  return !log.business;
}

function sortLogs(logs: TimeLog[], col: SortCol, dir: SortDir): TimeLog[] {
  return [...logs].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (col === "date") { av = a.date; bv = b.date; }
    else if (col === "quarter") { av = a.quarter; bv = b.quarter; }
    else if (col === "category") { av = a.category; bv = b.category; }
    else if (col === "hours") { av = a.hours; bv = b.hours; }
    else if (col === "staffMember") { av = a.staffMember; bv = b.staffMember; }
    else if (col === "entrepreneur") { av = parsedName(a).toLowerCase(); bv = parsedName(b).toLowerCase(); }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

export default function TimePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQ, setFilterQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", quarter: "", category: "EJ Meetup", hours: "2", staffMember: "Jerry", notes: "" });
  const [saving, setSaving] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [assigning, setAssigning] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: "", quarter: "", category: "", hours: "", staffMember: "", notes: "" });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterQ) params.set("quarter", filterQ);
    if (filterCat) params.set("category", filterCat);
    fetch(`/api/admin/time?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filterQ, filterCat]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as { role?: string }).role !== "ADMIN") { router.push("/"); return; }
    load();
    fetch("/api/admin/cohort")
      .then(r => r.json())
      .then((entries: Array<{ id: string; name: string }>) => {
        setBusinesses(entries.map(e => ({ id: e.id, name: e.name })));
      });
  }, [session, status, router, load]);

  async function addLog() {
    if (!form.date || !form.hours) return;
    setSaving(true);
    const res = await fetch("/api/admin/time", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setLogs(prev => [created, ...prev]);
      setForm({ date: "", quarter: "", category: "EJ Meetup", hours: "2", staffMember: "Jerry", notes: "" });
      setAdding(false);
    }
    setSaving(false);
  }

  async function deleteLog(id: string) {
    await fetch(`/api/admin/time/${id}`, { method: "DELETE" });
    setLogs(prev => prev.filter(l => l.id !== id));
  }

  async function assignBusiness(logId: string, inputValue: string) {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const match = businesses.find(b => b.name.toLowerCase() === trimmed.toLowerCase());
    if (!match) return;
    const log = logs.find(l => l.id === logId);
    const rawNotes = log?.notes ?? null;
    const cleanNotes = rawNotes?.replace(/\s*\(unmatched\)$/, "").trim() || null;
    const finalNotes = cleanNotes === match.name ? null : cleanNotes;
    await fetch(`/api/admin/time/${logId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: match.id, notes: finalNotes }),
    });
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, business: match, notes: finalNotes } : l));
    setAssigning(s => { const n = { ...s }; delete n[logId]; return n; });
  }

  function handleAssignChange(logId: string, value: string) {
    setAssigning(s => ({ ...s, [logId]: value }));
    const match = businesses.find(b => b.name.toLowerCase() === value.toLowerCase().trim());
    if (match) assignBusiness(logId, value);
  }

  function startEdit(l: TimeLog) {
    setEditing(l.id);
    setEditForm({
      date: new Date(l.date).toISOString().slice(0, 10),
      quarter: l.quarter,
      category: l.category,
      hours: String(l.hours),
      staffMember: l.staffMember,
      notes: l.notes && !l.notes.includes("(unmatched)") ? l.notes : "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/time/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setLogs(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
    setEditing(null);
    setSaving(false);
  }

  if (status === "loading") return null;

  const totalHours = logs.reduce((s, l) => s + l.hours, 0);
  const byCategory = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + l.hours;
    return acc;
  }, {});
  const quarters = [...new Set(logs.map(l => l.quarter).filter(Boolean))].sort();
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const unmatchedCount = logs.filter(isUnmatched).length;

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sorted = sortLogs(logs, sortCol, sortDir);

  const thStyle = (col: SortCol): React.CSSProperties => ({
    padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.65rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    color: sortCol === col ? "var(--color-limestone)" : "var(--color-text-muted)",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
  });

  const ind = (col: SortCol) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "1040px" }}>
      <div>
        <span className="eyebrow">Administration</span>
        <h1>Program Time Log</h1>
        <p style={{ marginTop: "0.25rem", color: "var(--color-text-muted)" }}>Group sessions, events, and admin hours not tied to a specific entrepreneur.</p>
      </div>
      <Link href="/admin" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", alignSelf: "flex-start" }}>← Back to admin</Link>

      {/* Summary */}
      {logs.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="card" style={{ padding: "0.9rem 1.25rem", minWidth: "110px" }}>
            <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-dome-gold)", lineHeight: 1 }}>{totalHours.toLocaleString()}</p>
            <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>Total hours</p>
          </div>
          {Object.entries(byCategory).sort(([,a],[,b]) => b - a).map(([cat, h]) => (
            <div key={cat} className="card" style={{ padding: "0.9rem 1.25rem", minWidth: "100px" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-limestone)", lineHeight: 1 }}>{h}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>{cat}</p>
            </div>
          ))}
          {unmatchedCount > 0 && (
            <div className="card" style={{ padding: "0.9rem 1.25rem", minWidth: "100px" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#e07070", lineHeight: 1 }}>{unmatchedCount}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>Unmatched</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterQ} onChange={e => setFilterQ(e.target.value)} style={{ ...inp, width: "130px" }}>
          <option value="">All quarters</option>
          {quarters.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inp, width: "160px" }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c || "All categories"}</option>)}
        </select>
        <button className="btn btn--primary" style={{ marginLeft: "auto", fontSize: "0.8rem" }} onClick={() => setAdding(v => !v)}>
          {adding ? "Cancel" : "+ Log entry"}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>New program entry</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.6rem" }}>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Date *</label><input style={{ ...inp, width: "100%" }} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Hours *</label><input style={{ ...inp, width: "100%" }} type="number" step="0.25" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} /></div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Category</label>
              <select style={{ ...inp, width: "100%" }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Staff</label><input style={{ ...inp, width: "100%" }} value={form.staffMember} onChange={e => setForm(f => ({ ...f, staffMember: e.target.value }))} /></div>
            <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Quarter</label><input style={{ ...inp, width: "100%" }} value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))} placeholder="Q2 2025" /></div>
          </div>
          <div><label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Notes</label><textarea style={{ ...inp, width: "100%", minHeight: "52px", resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn--primary" style={{ fontSize: "0.8rem" }} onClick={addLog} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn btn--ghost" style={{ fontSize: "0.8rem" }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Log table */}
      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      ) : logs.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>No entries found.</p>
      ) : (
        <>
          <datalist id="biz-list">
            {businesses.map(b => <option key={b.id} value={b.name} />)}
          </datalist>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-strong)" }}>
                  <th style={thStyle("date")} onClick={() => toggleSort("date")}>Date{ind("date")}</th>
                  <th style={thStyle("quarter")} onClick={() => toggleSort("quarter")}>Quarter{ind("quarter")}</th>
                  <th style={thStyle("category")} onClick={() => toggleSort("category")}>Category{ind("category")}</th>
                  <th style={thStyle("hours")} onClick={() => toggleSort("hours")}>Hours{ind("hours")}</th>
                  <th style={thStyle("staffMember")} onClick={() => toggleSort("staffMember")}>Staff{ind("staffMember")}</th>
                  <th style={thStyle("entrepreneur")} onClick={() => toggleSort("entrepreneur")}>Entrepreneur{ind("entrepreneur")}</th>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Notes</th>
                  <th style={{ padding: "0.5rem 0.75rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(l => {
                  const unmatched = isUnmatched(l);
                  const assignable = isAssignable(l);
                  const displayName = parsedName(l);
                  const assignVal = assigning[l.id] ?? (assignable ? displayName : "");
                  const rowNotes = l.notes && !l.notes.includes("(unmatched)") ? l.notes : null;
                  const isEditing = editing === l.id;

                  if (isEditing) {
                    return (
                      <tr key={l.id} style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "0.4rem 0.5rem" }}><input style={{ ...inp, width: "120px" }} type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></td>
                        <td style={{ padding: "0.4rem 0.5rem" }}><input style={{ ...inp, width: "80px" }} value={editForm.quarter} onChange={e => setEditForm(f => ({ ...f, quarter: e.target.value }))} placeholder="Q2 2025" /></td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>
                          <select style={{ ...inp, width: "130px" }} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                            {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "0.4rem 0.5rem" }}><input style={{ ...inp, width: "60px" }} type="number" step="0.25" value={editForm.hours} onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))} /></td>
                        <td style={{ padding: "0.4rem 0.5rem" }}><input style={{ ...inp, width: "90px" }} value={editForm.staffMember} onChange={e => setEditForm(f => ({ ...f, staffMember: e.target.value }))} /></td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>
                          {l.business ? (
                            <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>{l.business.name}</span>
                          ) : (
                            <input list="biz-list" value={assignVal} onChange={e => handleAssignChange(l.id, e.target.value)} onBlur={e => assignBusiness(l.id, e.target.value)} placeholder="assign…" style={{ ...inp, padding: "0.25rem 0.5rem", width: "100%", fontSize: "0.75rem" }} />
                          )}
                        </td>
                        <td style={{ padding: "0.4rem 0.5rem" }}><input style={{ ...inp, width: "140px" }} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="notes…" /></td>
                        <td style={{ padding: "0.4rem 0.5rem", whiteSpace: "nowrap" }}>
                          <button onClick={() => saveEdit(l.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-dome-gold)", marginRight: "0.5rem" }}>{saving ? "…" : "Save"}</button>
                          <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Cancel</button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--color-border)", background: unmatched ? "rgba(224,112,112,0.04)" : undefined }}>
                      <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>{fmtDate(l.date)}</td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-muted)" }}>{l.quarter}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>{l.category}</td>
                      <td style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "var(--color-dome-gold)" }}>{l.hours}</td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-muted)" }}>{l.staffMember}</td>
                      <td style={{ padding: "0.5rem 0.75rem", minWidth: "160px" }}>
                        {l.business ? (
                          <span style={{ color: "var(--color-limestone)" }}>{l.business.name}</span>
                        ) : (
                          <input
                            list="biz-list"
                            value={assignVal}
                            onChange={e => handleAssignChange(l.id, e.target.value)}
                            onBlur={e => assignBusiness(l.id, e.target.value)}
                            placeholder="assign…"
                            style={{
                              ...inp,
                              padding: "0.25rem 0.5rem",
                              width: "100%",
                              fontSize: "0.75rem",
                              color: unmatched ? "#e07070" : "var(--color-text-muted)",
                              opacity: unmatched ? 1 : 0.65,
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-text-muted)", fontStyle: "italic", maxWidth: "180px" }}>{rowNotes ?? ""}</td>
                      <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>
                        <button onClick={() => startEdit(l)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-text-muted)", marginRight: "0.5rem" }}>Edit</button>
                        <button onClick={() => deleteLog(l.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#e07070" }}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

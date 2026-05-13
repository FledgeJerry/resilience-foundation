"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BusinessSummary = {
  id: string;
  name: string;
  description: string | null;
  type: "UNDECIDED" | "TRADITIONAL" | "COOP";
  stage: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  role: string;
  _count: { contacts: number; deals: number; transactions: number };
  updatedAt: string;
};

const STAGE_LABELS: Record<string, string> = {
  IDEA: "Stage 1 — Idea",
  KNOW_GROUND: "Stage 2 — Know Your Ground",
  FIND_PEOPLE: "Stage 3 — Find Your People",
  BUILD_STRUCTURE: "Stage 4 — Build Structure",
  TEST_SMALL: "Stage 5 — Test Small",
  GET_SUPPORT: "Stage 6 — Get Support",
  SUSTAIN: "Stage 7 — Sustain It",
  GROW: "Stage 8 — Grow the Ecosystem",
};

const TYPE_LABELS: Record<string, string> = {
  UNDECIDED: "Path undecided",
  TRADITIONAL: "Traditional",
  COOP: "Worker Co-op",
};

export default function BusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", industry: "", city: "", state: "" });

  useEffect(() => {
    fetch("/api/journey/businesses")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setBusinesses(data); })
      .finally(() => setLoading(false));
  }, [router]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/journey/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const biz = await res.json();
    setCreating(false);
    if (res.ok) router.push(`/journey/businesses/${biz.id}`);
  }

  if (loading) return <main className="container"><p className="loading-text">Loading…</p></main>;

  return (
    <main className="journey-businesses">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>My Businesses</h1>
            <p className="page-header__sub">
              Track each venture separately. Every contact, deal, and transaction lives here.
            </p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ New Business"}
          </button>
        </div>

        {showForm && (
          <form className="journey-create-form" onSubmit={create}>
            <h2>Start a new business</h2>
            <div className="form-row">
              <label>
                Business name <span className="required">*</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="What do you want to call it?"
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                What&apos;s the idea? (optional)
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="One or two sentences is fine — you can fill this out later."
                  rows={2}
                />
              </label>
            </div>
            <div className="form-row form-row--3col">
              <label>
                Industry
                <input
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Food, Tech, Services"
                />
              </label>
              <label>
                City
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Lansing"
                />
              </label>
              <label>
                State
                <input
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="MI"
                  maxLength={2}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={creating}>
                {creating ? "Creating…" : "Create & open workbook"}
              </button>
            </div>
          </form>
        )}

        {businesses.length === 0 && !showForm ? (
          <div className="empty-state">
            <p>You haven&apos;t started any businesses yet.</p>
            <button className="btn btn--primary" onClick={() => setShowForm(true)}>
              Start your first one
            </button>
          </div>
        ) : (
          <div className="biz-grid">
            {businesses.map((b) => (
              <Link key={b.id} href={`/journey/businesses/${b.id}`} className="biz-card">
                <div className="biz-card__header">
                  <div>
                    <div className="biz-card__name">{b.name}</div>
                    {b.description && <div className="biz-card__desc">{b.description}</div>}
                  </div>
                  <span className={`biz-card__type biz-card__type--${b.type.toLowerCase()}`}>
                    {TYPE_LABELS[b.type]}
                  </span>
                </div>

                <div className="biz-card__stage">{STAGE_LABELS[b.stage] ?? b.stage}</div>

                <div className="biz-card__meta">
                  {(b.city || b.industry) && (
                    <span>{[b.city, b.state].filter(Boolean).join(", ")}{b.industry ? ` · ${b.industry}` : ""}</span>
                  )}
                  <span className="biz-card__counts">
                    {b._count.contacts} contacts · {b._count.deals} deals · {b._count.transactions} transactions
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="journey-back">
          <Link href="/journey">← See all 8 stages</Link>
        </div>
      </div>
    </main>
  );
}

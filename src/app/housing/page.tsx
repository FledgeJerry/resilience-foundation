"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "intro" | "deal" | "treasury" | "results";

type Deal = {
  purchasePrice: string;
  renovationCost: string;
  postRenoValue: string;
  shareCount: string;
};

type Treasury = {
  monthlyRent: string;
  propertyTax: string;
  insurance: string;
  maintenanceReserve: string;
  rainyDayPct: string;
};

// ─── Derived math ─────────────────────────────────────────────────────────────

function calcDeal(d: Deal) {
  const purchase = parseFloat(d.purchasePrice) || 0;
  const reno = parseFloat(d.renovationCost) || 0;
  const postReno = parseFloat(d.postRenoValue) || 0;
  const shareCount = Math.max(1, parseInt(d.shareCount) || 1000);
  const totalRaise = purchase + reno;
  const issuePrice = shareCount > 0 ? totalRaise / shareCount : 0;
  const equityBuffer = postReno - totalRaise;
  const equityPct = totalRaise > 0 ? ((postReno - totalRaise) / totalRaise) * 100 : 0;
  const perShareValueDay1 = shareCount > 0 ? postReno / shareCount : 0;
  return { purchase, reno, postReno, shareCount, issuePrice, totalRaise, equityBuffer, equityPct, perShareValueDay1 };
}

function calcTreasury(t: Treasury, sharesNeeded: number) {
  const rent = parseFloat(t.monthlyRent) || 0;
  const tax = parseFloat(t.propertyTax) || 0;
  const ins = parseFloat(t.insurance) || 0;
  const maint = parseFloat(t.maintenanceReserve) || 0;
  const rainyPct = parseFloat(t.rainyDayPct) || 10;
  const monthlyExpenses = tax + ins + maint;
  const afterExpenses = Math.max(0, rent - monthlyExpenses);
  const rainyDay = Math.round(afterExpenses * (rainyPct / 100));
  const monthlySurplus = afterExpenses - rainyDay;
  const annualSurplus = monthlySurplus * 12;
  const surplusPerShare = sharesNeeded > 0 ? annualSurplus / sharesNeeded : 0;
  return { rent, monthlyExpenses, afterExpenses, rainyDay, monthlySurplus, annualSurplus, surplusPerShare };
}

// ─── Shared components ────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const steps = ["How it works", "The deal", "The treasury", "Your results"];
  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2.5rem" }}>
      {steps.map((label, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "center" }}>
          <div style={{
            height: "4px", width: "100%", borderRadius: "2px",
            background: i <= step ? "var(--color-dome-gold)" : "var(--color-border-strong)",
            transition: "background 0.3s",
          }} />
          <span style={{ fontSize: "0.65rem", color: i <= step ? "var(--color-dome-gold)" : "var(--color-text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: "6px",
  padding: "0.65rem 0.9rem",
  color: "var(--color-limestone)",
  fontFamily: "var(--font-sans)",
  fontSize: "1rem",
  outline: "none",
};

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "1.25rem 1rem" }}>
      <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 700, color: accent ? "var(--color-dome-gold)" : "var(--color-limestone)", lineHeight: 1, marginBottom: sub ? "0.35rem" : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{sub}</p>}
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function IntroPage({ onStart }: { onStart: () => void }) {
  const steps = [
    { n: "01", label: "Find the house", desc: "The community scouts an undervalued property. A $50K house that needs $25K in work and will be worth $100K when done." },
    { n: "02", label: "Raise the shares", desc: "Issue 1,000 shares — priced at total cost ÷ 1,000. On a $75K raise that's $75/share. Anyone can buy one or many. One person, one vote regardless of how many shares you hold." },
    { n: "03", label: "Purchase + renovate", desc: "The $75K raised buys the house and funds the repairs. Post-renovation each share is worth $100K ÷ 1,000 = $100 — immediate built-in equity for every shareholder." },
    { n: "04", label: "Rent it. Build the treasury.", desc: "The house is rented out. All rent goes into the community treasury. Fixed expenses come out first — taxes, insurance, maintenance, rainy-day fund." },
    { n: "05", label: "Vote on the surplus", desc: "Shareholders vote on what to do with what's left. Distribute as dividends. Fund improvements. Buy another house. The community decides." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
      <div>
        <span className="eyebrow">Housing Roadmap</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>Sunshine House</h1>
        <p style={{ fontSize: "1.05rem", maxWidth: "620px" }}>
          A community share offering that turns an undervalued house into collectively owned housing — with immediate equity, democratic governance, and shared returns.
        </p>
      </div>

      {/* The five steps */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem" }}>How it works</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {steps.map(({ n, label, desc }, i) => (
            <div key={n} style={{ display: "flex", gap: "1.25rem", position: "relative", paddingBottom: i < steps.length - 1 ? "1.75rem" : 0 }}>
              {/* Timeline line */}
              {i < steps.length - 1 && (
                <div style={{ position: "absolute", left: "19px", top: "40px", bottom: 0, width: "2px", background: "var(--color-border-strong)" }} />
              )}
              {/* Number circle */}
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                background: "var(--color-dome-gold)", color: "var(--color-midnight-steel)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.75rem", fontFamily: "var(--font-sans)",
                zIndex: 1,
              }}>
                {n}
              </div>
              <div style={{ paddingTop: "0.6rem" }}>
                <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.3rem" }}>{label}</p>
                <p style={{ fontSize: "0.875rem" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key principles */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>The rules that matter</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" }}>
          {[
            { title: "One person, one vote", desc: "Share count doesn't matter in governance. Every shareholder has equal democratic power." },
            { title: "Shares are transferable", desc: "You can sell or transfer your shares. The house stays in community hands regardless." },
            { title: "Open books always", desc: "Full treasury access for all shareholders — income, expenses, reserves, surplus balance." },
            { title: "Community-decided surplus", desc: "Profit distribution, reinvestment, or expansion — shareholders vote on every dollar left after expenses." },
          ].map(({ title, desc }) => (
            <div key={title} className="card--raised" style={{ borderLeft: "3px solid var(--color-dome-gold)" }}>
              <p style={{ fontWeight: 700, color: "var(--color-dome-gold)", marginBottom: "0.4rem", fontSize: "0.9rem" }}>{title}</p>
              <p style={{ fontSize: "0.85rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vs standard rental */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>Why this beats standard rental investment</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          <div className="card" style={{ borderLeft: "3px solid rgba(192,57,43,0.6)" }}>
            <p style={{ fontWeight: 700, color: "#e07070", marginBottom: "0.5rem" }}>Individual landlord model</p>
            <p style={{ fontSize: "0.875rem" }}>One person owns the building. Tenants pay rent that builds the landlord&apos;s equity. Tenants are displaced when convenient. Profit leaves the neighborhood.</p>
          </div>
          <div className="card--raised" style={{ borderLeft: "3px solid var(--color-dome-gold)" }}>
            <p style={{ fontWeight: 700, color: "var(--color-dome-gold)", marginBottom: "0.5rem" }}>Sunshine House model</p>
            <p style={{ fontSize: "0.875rem" }}>The community owns the building. Rent builds the community treasury. Shareholders vote on how profits are used. Wealth stays in the neighborhood.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "1.5rem 0 2rem", borderTop: "1px solid var(--color-border)" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>Run the numbers on a real house</h2>
        <p style={{ marginBottom: "1.75rem", maxWidth: "480px", margin: "0 auto 1.75rem" }}>
          Plug in a property and we&apos;ll show you the share structure, instant equity, and estimated treasury returns.
        </p>
        <button className="btn btn--primary" onClick={onStart}>
          Model a house &rarr;
        </button>
      </div>
    </div>
  );
}

function DealPage({ deal, setDeal, onNext, onBack }: {
  deal: Deal; setDeal: (d: Deal) => void; onNext: () => void; onBack: () => void;
}) {
  const set = (k: keyof Deal, v: string) => setDeal({ ...deal, [k]: v });
  const { totalRaise, shareCount, issuePrice, equityBuffer, equityPct, perShareValueDay1 } = calcDeal(deal);
  const canContinue = deal.purchasePrice && deal.renovationCost && deal.postRenoValue;
  const hasNumbers = totalRaise > 0 && parseFloat(deal.postRenoValue) > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <span className="eyebrow">Step 1 of 3</span>
        <h2 style={{ fontSize: "1.6rem" }}>The deal</h2>
        <p>Enter the numbers for the house you&apos;re looking at.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "480px" }}>
        <div>
          <label>Purchase price ($)</label>
          <input type="number" min="0" placeholder="e.g. 50000" style={inputStyle} value={deal.purchasePrice} onChange={e => set("purchasePrice", e.target.value)} />
        </div>
        <div>
          <label>Renovation / repair budget ($)</label>
          <input type="number" min="0" placeholder="e.g. 25000" style={inputStyle} value={deal.renovationCost} onChange={e => set("renovationCost", e.target.value)} />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            Total cost to make it habitable and rentable.
          </p>
        </div>
        <div>
          <label>Estimated value after renovation ($)</label>
          <input type="number" min="0" placeholder="e.g. 100000" style={inputStyle} value={deal.postRenoValue} onChange={e => set("postRenoValue", e.target.value)} />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            Conservative ARV — what it will appraise for once work is done.
          </p>
        </div>
        <div>
          <label>Number of shares to issue — default 1,000</label>
          <input type="number" min="1" placeholder="1000" style={inputStyle} value={deal.shareCount} onChange={e => set("shareCount", e.target.value)} />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            Each share is priced at <strong style={{ color: "var(--color-limestone)" }}>total raise ÷ shares</strong>.
            After renovation, each share is worth <strong style={{ color: "var(--color-limestone)" }}>post-reno value ÷ shares</strong>.
          </p>
        </div>
      </div>

      {/* Live preview */}
      {hasNumbers && (
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            Live preview
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <StatBox label="Total raise needed" value={`$${totalRaise.toLocaleString()}`} />
            <StatBox label="Shares to issue" value={shareCount.toLocaleString()} sub={`$${issuePrice.toFixed(2)} each at launch`} />
            <StatBox
              label="Per-share value day 1"
              value={`$${perShareValueDay1.toFixed(2)}`}
              sub={`paid $${issuePrice.toFixed(2)} — gain $${(perShareValueDay1 - issuePrice).toFixed(2)}`}
              accent={perShareValueDay1 > issuePrice}
            />
            <StatBox
              label="Total equity buffer"
              value={equityBuffer >= 0 ? `$${equityBuffer.toLocaleString()}` : `-$${Math.abs(equityBuffer).toLocaleString()}`}
              sub={`${equityPct >= 0 ? "+" : ""}${equityPct.toFixed(0)}% above cost`}
              accent={equityBuffer > 0}
            />
          </div>
          {equityBuffer <= 0 && (
            <div className="alert alert--error" style={{ marginTop: "1rem" }}>
              The post-renovation value is less than what the raise will cost. Re-check your numbers — a good Sunshine House deal should have a meaningful equity buffer above the raise amount.
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <button className="btn btn--ghost" onClick={onBack}>&larr; Back</button>
        <button className="btn btn--primary" disabled={!canContinue} onClick={onNext}>Model the treasury &rarr;</button>
      </div>
    </div>
  );
}

function TreasuryPage({ deal, treasury, setTreasury, shareCount, onNext, onBack }: {
  deal: Deal; treasury: Treasury; setTreasury: (t: Treasury) => void; shareCount: number; onNext: () => void; onBack: () => void;
}) {
  const set = (k: keyof Treasury, v: string) => setTreasury({ ...treasury, [k]: v });
  const { rent, monthlyExpenses, afterExpenses, rainyDay, monthlySurplus, annualSurplus, surplusPerShare } = calcTreasury(treasury, shareCount);
  const canContinue = treasury.monthlyRent;
  const hasNumbers = rent > 0;

  const rainyPct = parseFloat(treasury.rainyDayPct) || 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <span className="eyebrow">Step 2 of 3</span>
        <h2 style={{ fontSize: "1.6rem" }}>The treasury</h2>
        <p>Model the monthly cash flow. All rent goes into the treasury — here&apos;s where it goes.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "480px" }}>
        <div>
          <label>Expected monthly rent ($)</label>
          <input type="number" min="0" placeholder="e.g. 900" style={inputStyle} value={treasury.monthlyRent} onChange={e => set("monthlyRent", e.target.value)} />
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: "1rem" }}>
            Monthly fixed expenses (estimates)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label>Property tax (monthly, $)</label>
              <input type="number" min="0" placeholder="e.g. 80" style={inputStyle} value={treasury.propertyTax} onChange={e => set("propertyTax", e.target.value)} />
            </div>
            <div>
              <label>Insurance (monthly, $)</label>
              <input type="number" min="0" placeholder="e.g. 100" style={inputStyle} value={treasury.insurance} onChange={e => set("insurance", e.target.value)} />
            </div>
            <div>
              <label>Maintenance & reserves (monthly, $)</label>
              <input type="number" min="0" placeholder="e.g. 120" style={inputStyle} value={treasury.maintenanceReserve} onChange={e => set("maintenanceReserve", e.target.value)} />
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
                Rule of thumb: 1–2% of home value per year. On a $100K home, ~$83–167/mo.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label>Rainy-day fund (% of remainder, default 10%)</label>
          <input type="number" min="0" max="100" placeholder="10" style={inputStyle} value={treasury.rainyDayPct} onChange={e => set("rainyDayPct", e.target.value)} />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            Set aside before any distribution. Covers unexpected repairs and vacancies.
          </p>
        </div>
      </div>

      {/* Live treasury waterfall */}
      {hasNumbers && (
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            Monthly treasury flow
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "480px" }}>
            {[
              { label: "Rent collected", val: rent, color: "var(--color-dome-gold)", sign: "+" },
              { label: "Fixed expenses (tax + insurance + maintenance)", val: -monthlyExpenses, color: "#e07070", sign: "−" },
              { label: `Rainy-day fund (${rainyPct}%)`, val: -rainyDay, color: "var(--color-text-muted)", sign: "−" },
              { label: "Surplus — available for shareholder vote", val: monthlySurplus, color: "var(--color-teal-accent)", sign: "=" },
            ].map(({ label, val, color, sign }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--color-surface)", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color, whiteSpace: "nowrap", marginLeft: "1rem" }}>
                  {sign} ${Math.abs(val).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
            <StatBox label="Annual surplus" value={`$${annualSurplus.toLocaleString()}`} accent />
            <StatBox label="Annual surplus per share" value={`$${surplusPerShare.toFixed(2)}`} sub={`on a $${calcDeal(deal).issuePrice.toFixed(2)} investment`} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <button className="btn btn--ghost" onClick={onBack}>&larr; Back</button>
        <button className="btn btn--primary" disabled={!canContinue} onClick={onNext}>See the full picture &rarr;</button>
      </div>
    </div>
  );
}

function ResultsPage({ deal, treasury, onRestart }: { deal: Deal; treasury: Treasury; onRestart: () => void }) {
  const d = calcDeal(deal);
  const t = calcTreasury(treasury, d.shareCount);
  const yieldPct = d.issuePrice > 0 ? (t.surplusPerShare / d.issuePrice) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <div>
        <span className="eyebrow">Your results</span>
        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>The full picture</h2>
        <p>Here&apos;s what the Sunshine House model looks like for this property.</p>
      </div>

      {/* Deal summary */}
      <div>
        <h3 style={{ fontSize: "1rem", color: "var(--color-limestone)", marginBottom: "1rem" }}>The deal</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
          <StatBox label="Total raise" value={`$${d.totalRaise.toLocaleString()}`} />
          <StatBox label="Post-reno value" value={`$${d.postReno.toLocaleString()}`} />
          <StatBox label="Instant equity" value={`$${d.equityBuffer.toLocaleString()}`} sub={`+${d.equityPct.toFixed(0)}% above cost`} accent={d.equityBuffer > 0} />
          <StatBox label="Shares issued" value={d.shareCount.toLocaleString()} sub={`$${d.issuePrice.toFixed(2)} issue price`} />
        </div>
      </div>

      {/* Per-share story */}
      <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "12px", padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", color: "var(--color-limestone)", marginBottom: "1.25rem" }}>What does one share mean?</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Issue price (what you pay)</span>
            <strong style={{ color: "var(--color-limestone)" }}>${d.issuePrice.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Value on day 1 (post-renovation)</span>
            <strong style={{ color: "var(--color-dome-gold)" }}>${d.perShareValueDay1.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Estimated annual surplus per share</span>
            <strong style={{ color: "var(--color-teal-accent)" }}>${t.surplusPerShare.toFixed(2)}</strong>
          </div>
          {yieldPct > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Annualized yield (surplus ÷ share price)</span>
              <strong style={{ color: "var(--color-teal-accent)" }}>{yieldPct.toFixed(1)}%</strong>
            </div>
          )}
          <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            Plus: your proportional share of any appreciation when the property is eventually sold — and one vote on how the surplus is used.
          </div>
        </div>
      </div>

      {/* Treasury summary */}
      <div>
        <h3 style={{ fontSize: "1rem", color: "var(--color-limestone)", marginBottom: "1rem" }}>Monthly treasury</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
          <StatBox label="Monthly rent" value={`$${t.rent.toLocaleString()}`} />
          <StatBox label="Fixed expenses" value={`$${t.monthlyExpenses.toLocaleString()}`} />
          <StatBox label="Rainy-day fund" value={`$${t.rainyDay.toLocaleString()}`} />
          <StatBox label="Monthly surplus" value={`$${t.monthlySurplus.toLocaleString()}`} accent />
        </div>
      </div>

      {/* Governance callout */}
      <div style={{ background: "rgba(46,109,164,0.1)", border: "1px solid rgba(46,109,164,0.25)", borderRadius: "10px", padding: "1.25rem 1.5rem" }}>
        <p style={{ fontWeight: 700, color: "#7DB8E8", marginBottom: "0.5rem", fontSize: "0.9rem" }}>One person, one vote</p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          Every decision about this surplus — pay it out, fund improvements, buy another house — is made democratically. It doesn&apos;t matter if you own 1 share or 100. Your vote counts the same as every other shareholder&apos;s.
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "2rem", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border-strong)", textAlign: "center" }}>
        <h3 style={{ fontSize: "1.2rem" }}>Ready to find a house?</h3>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto" }}>
          Connect with the Fledge Forward team to identify properties, structure the share offering, and get your community organized.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/about" className="btn btn--primary">Connect with Fledge Forward</Link>
          <button className="btn btn--ghost" onClick={onRestart}>Model another house</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HousingPage() {
  const [step, setStep] = useState<Step>("intro");
  const [deal, setDeal] = useState<Deal>({ purchasePrice: "", renovationCost: "", postRenoValue: "", shareCount: "1000" });
  const [treasury, setTreasury] = useState<Treasury>({ monthlyRent: "", propertyTax: "", insurance: "", maintenanceReserve: "", rainyDayPct: "10" });

  const stepIndex = { intro: 0, deal: 1, treasury: 2, results: 3 }[step];

  function restart() {
    setDeal({ purchasePrice: "", renovationCost: "", postRenoValue: "", shareCount: "1000" });
    setTreasury({ monthlyRent: "", propertyTax: "", insurance: "", maintenanceReserve: "", rainyDayPct: "10" });
    setStep("intro");
  }

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <ProgressBar step={stepIndex} />

      {step === "intro" && <IntroPage onStart={() => setStep("deal")} />}
      {step === "deal" && (
        <DealPage deal={deal} setDeal={setDeal} onNext={() => setStep("treasury")} onBack={() => setStep("intro")} />
      )}
      {step === "treasury" && (
        <TreasuryPage
          treasury={treasury}
          setTreasury={setTreasury}
          shareCount={calcDeal(deal).shareCount}
          onNext={() => setStep("results")}
          onBack={() => setStep("deal")}
          deal={deal}
        />
      )}
      {step === "results" && (
        <ResultsPage deal={deal} treasury={treasury} onRestart={restart} />
      )}
    </div>
  );
}

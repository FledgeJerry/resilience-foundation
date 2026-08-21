"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "intro" | "deal" | "treasury" | "results";

type Deal = {
  purchasePrice: string;
  renovationCost: string;
  postRenoValue: string;
  shareCount: string;
  treasuryReservePct: string;
  mortgageInterestRate: string;
  mortgageLoanTerm: string;
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
  const reservePct = Math.min(99, Math.max(0, parseFloat(d.treasuryReservePct) || 10));
  const totalRaise = purchase + reno;
  const treasuryShares = Math.round(shareCount * (reservePct / 100));
  const publicShares = shareCount - treasuryShares;
  const issuePrice = publicShares > 0 ? totalRaise / publicShares : 0;
  const equityBuffer = postReno - totalRaise;
  const equityPct = totalRaise > 0 ? ((postReno - totalRaise) / totalRaise) * 100 : 0;
  const perShareValueDay1 = shareCount > 0 ? postReno / shareCount : 0;
  const treasuryStakeValue = treasuryShares * perShareValueDay1;
  return { purchase, reno, postReno, shareCount, reservePct, treasuryShares, publicShares, issuePrice, totalRaise, equityBuffer, equityPct, perShareValueDay1, treasuryStakeValue };
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

// Amortization: returns cumulative principal paid through month N (1-indexed)
function amortPrincipalCumulative(principal: number, annualRatePct: number, termYears: number, throughMonth: number): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal * (throughMonth / n);
  const M = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  let balance = principal;
  let cumPrincipal = 0;
  const months = Math.min(throughMonth, n);
  for (let i = 0; i < months; i++) {
    const interest = balance * r;
    const pmt = Math.min(M, balance + interest);
    const principalPmt = pmt - interest;
    cumPrincipal += principalPmt;
    balance -= principalPmt;
  }
  return cumPrincipal;
}

// Equity milestones for renter at key year marks
function renterEquityProjection(postRenoValue: number, annualRatePct: number, termYears: number, totalShares: number) {
  const shareValue = postRenoValue / totalShares;
  const milestones = [1, 2, 5, 10, 15, 20, 25, 30].filter(y => y <= termYears);
  return milestones.map(year => {
    const cumPrincipal = amortPrincipalCumulative(postRenoValue, annualRatePct, termYears, year * 12);
    const sharesEarned = Math.floor(cumPrincipal / shareValue);
    const pctOwnership = (sharesEarned / totalShares) * 100;
    const equityValue = sharesEarned * shareValue;
    return { year, sharesEarned, pctOwnership, equityValue, cumPrincipal };
  });
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
    {
      n: "01", label: "Find the house",
      desc: "The community scouts an undervalued property. A $50K house that needs $25K in work and will be worth $100K when done.",
    },
    {
      n: "02", label: "Raise the shares",
      desc: "Issue 1,000 shares — priced at total cost ÷ shares sold. On a $75K raise that's $75/share. Anyone can invest — one person, one vote regardless of how many shares you hold.",
    },
    {
      n: "03", label: "Purchase + renovate",
      desc: "The $75K raised buys the house and funds the repairs. Post-renovation each share is worth $100K ÷ 1,000 = $100 — immediate built-in equity for every shareholder.",
    },
    {
      n: "04", label: "Rent it — but not like a landlord",
      desc: "The house is rented to a community member at market rate. Here's the key difference: part of every rent payment is automatically converted into shares — just like how a 30-year mortgage builds equity month by month. The renter becomes an owner over time.",
    },
    {
      n: "05", label: "Build the treasury",
      desc: "All rent flows into the community treasury. Fixed expenses come out first — taxes, insurance, maintenance. What's left is surplus.",
    },
    {
      n: "06", label: "Vote on the surplus",
      desc: "Shareholders vote on what to do with what's left. Distribute dividends. Fund improvements. Buy another house. The community decides — including the renter, who now holds shares.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>

      {/* Hero */}
      <div>
        <span className="eyebrow">Housing Roadmap</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>Fledge Fractals</h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "640px", marginBottom: "1rem" }}>
          A community-owned housing model that turns renters into owners — one share at a time. We built this in response to the housing crisis, and it starts with a simple idea: rent should build equity, not just a landlord&apos;s wealth.
        </p>
        <div style={{ background: "rgba(74,155,142,0.1)", border: "1px solid rgba(74,155,142,0.25)", borderRadius: "10px", padding: "1.1rem 1.4rem", maxWidth: "620px" }}>
          <p style={{ fontWeight: 700, color: "var(--color-teal-accent)", marginBottom: "0.4rem", fontSize: "0.9rem" }}>Renter-centric by design</p>
          <p style={{ fontSize: "0.875rem" }}>
            In a Fledge Fractals house, the renter is the first person the model serves. A portion of every rent payment is calculated using standard 30-year mortgage amortization — the same math that lets homeowners build equity — and converted into shares. Hit a 1/1,000 milestone? A share transfers to the renter&apos;s name. After 30 years, the renter has built the same equity they would have if they&apos;d had a mortgage from day one.
          </p>
        </div>
      </div>

      {/* The housing crisis callout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
        {[
          { icon: "🏘️", label: "The problem", text: "Millions of households pay rent their whole lives and retire with nothing. The wealth gap between renters and owners is the largest driver of generational poverty in America." },
          { icon: "🔑", label: "The barrier", text: "The 20% down payment. The 30-year commitment. The credit score. Most people who could handle a mortgage payment can't get past the front door." },
          { icon: "⚡", label: "The Fledge Fractals answer", text: "No down payment needed. Pay market rent. Each month, the principal portion of an equivalent mortgage converts to real shares in the house you live in." },
        ].map(({ icon, label, text }) => (
          <div key={label} className="card--raised" style={{ borderLeft: "3px solid var(--color-dome-gold)" }}>
            <p style={{ fontSize: "1.25rem", marginBottom: "0.4rem" }}>{icon}</p>
            <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.4rem", fontSize: "0.9rem" }}>{label}</p>
            <p style={{ fontSize: "0.85rem" }}>{text}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem" }}>How it works</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {steps.map(({ n, label, desc }, i) => (
            <div key={n} style={{ display: "flex", gap: "1.25rem", position: "relative", paddingBottom: i < steps.length - 1 ? "1.75rem" : 0 }}>
              {i < steps.length - 1 && (
                <div style={{ position: "absolute", left: "19px", top: "40px", bottom: 0, width: "2px", background: "var(--color-border-strong)" }} />
              )}
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                background: n === "04" ? "var(--color-teal-accent)" : "var(--color-dome-gold)",
                color: "var(--color-midnight-steel)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.75rem", fontFamily: "var(--font-sans)", zIndex: 1,
              }}>
                {n}
              </div>
              <div style={{ paddingTop: "0.6rem" }}>
                <p style={{ fontWeight: 700, color: n === "04" ? "var(--color-teal-accent)" : "var(--color-limestone)", marginBottom: "0.3rem" }}>{label}</p>
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
            { title: "Rent builds equity", desc: "The principal portion of an equivalent 30-year mortgage converts to shares each month. Renters build the same equity as homeowners." },
            { title: "One person, one vote", desc: "Share count doesn't matter in governance. Every shareholder — including the renter — has equal democratic power." },
            { title: "Shares are transferable", desc: "You can sell or transfer your shares. The house stays in community hands regardless." },
            { title: "Open books always", desc: "Full treasury access for all shareholders — income, expenses, reserves, surplus balance." },
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
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>Why this is different</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          <div className="card" style={{ borderLeft: "3px solid rgba(192,57,43,0.6)" }}>
            <p style={{ fontWeight: 700, color: "#e07070", marginBottom: "0.5rem" }}>Standard rental</p>
            <p style={{ fontSize: "0.875rem" }}>100% of rent builds the landlord&apos;s equity. Tenants are displaced when convenient. After 30 years of paying rent you own nothing.</p>
          </div>
          <div className="card" style={{ borderLeft: "3px solid rgba(232,200,74,0.5)" }}>
            <p style={{ fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>Traditional mortgage</p>
            <p style={{ fontSize: "0.875rem" }}>You build equity. But it requires a down payment, good credit, and 30 years of stable income. Millions of ALICE households are priced out entirely.</p>
          </div>
          <div className="card--raised" style={{ borderLeft: "3px solid var(--color-teal-accent)" }}>
            <p style={{ fontWeight: 700, color: "var(--color-teal-accent)", marginBottom: "0.5rem" }}>Fledge Fractals</p>
            <p style={{ fontSize: "0.875rem" }}>No down payment. Pay market rent. The principal portion converts to shares automatically. After 30 years you have the same equity as if you&apos;d had a mortgage from day one.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "1.5rem 0 2rem", borderTop: "1px solid var(--color-border)" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>Run the numbers on a real house</h2>
        <p style={{ marginBottom: "1.75rem", maxWidth: "480px", margin: "0 auto 1.75rem" }}>
          Plug in a property and we&apos;ll show you the share structure, renter equity timeline, and estimated treasury returns.
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
  const { totalRaise, shareCount, publicShares, treasuryShares, issuePrice, equityBuffer, perShareValueDay1, treasuryStakeValue } = calcDeal(deal);
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
        </div>
        <div>
          <label>Estimated value after renovation ($)</label>
          <input type="number" min="0" placeholder="e.g. 100000" style={inputStyle} value={deal.postRenoValue} onChange={e => set("postRenoValue", e.target.value)} />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            Conservative ARV. This becomes the &quot;principal&quot; for renter equity calculations.
          </p>
        </div>
        <div>
          <label>Total shares — default 1,000</label>
          <input type="number" min="1" placeholder="1000" style={inputStyle} value={deal.shareCount} onChange={e => set("shareCount", e.target.value)} />
        </div>
        <div>
          <label>Treasury reserve (% of shares) — default 10%</label>
          <input type="number" min="0" max="99" placeholder="10" style={inputStyle} value={deal.treasuryReservePct} onChange={e => set("treasuryReservePct", e.target.value)} />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            Shares held back for future member sales, renter equity transfers, and liquidity.
          </p>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
            Renter equity parameters
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label>Reference mortgage rate (annual %, default 7.0%)</label>
              <input type="number" min="0" max="25" step="0.25" placeholder="7.0" style={inputStyle} value={deal.mortgageInterestRate} onChange={e => set("mortgageInterestRate", e.target.value)} />
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
                The rate used to calculate the renter&apos;s monthly principal portion. This is the reference — the renter pays rent, not a mortgage.
              </p>
            </div>
            <div>
              <label>Loan term (years, default 30)</label>
              <input type="number" min="1" max="50" placeholder="30" style={inputStyle} value={deal.mortgageLoanTerm} onChange={e => set("mortgageLoanTerm", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      {hasNumbers && (
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            Live preview
          </p>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
              Share structure ({shareCount.toLocaleString()} total)
            </p>
            <div style={{ display: "flex", height: "24px", borderRadius: "4px", overflow: "hidden", marginBottom: "0.5rem" }}>
              <div style={{ flex: publicShares, background: "var(--color-dome-gold)", transition: "flex 0.3s" }} />
              <div style={{ flex: treasuryShares, background: "var(--color-river-blue)", transition: "flex 0.3s" }} />
            </div>
            <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ display: "inline-block", width: "10px", height: "10px", background: "var(--color-dome-gold)", borderRadius: "2px" }} />
                <span style={{ color: "var(--color-text-secondary)" }}>Public: <strong style={{ color: "var(--color-limestone)" }}>{publicShares.toLocaleString()} shares</strong></span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ display: "inline-block", width: "10px", height: "10px", background: "var(--color-river-blue)", borderRadius: "2px" }} />
                <span style={{ color: "var(--color-text-secondary)" }}>Treasury reserve: <strong style={{ color: "var(--color-limestone)" }}>{treasuryShares.toLocaleString()} shares</strong></span>
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <StatBox label="Total raise needed" value={`$${totalRaise.toLocaleString()}`} sub={`from ${publicShares.toLocaleString()} public shares`} />
            <StatBox label="Issue price per share" value={`$${issuePrice.toFixed(2)}`} sub="public shares only" />
            <StatBox label="Per-share value day 1" value={`$${perShareValueDay1.toFixed(2)}`} sub={`gain $${(perShareValueDay1 - issuePrice).toFixed(2)} on day 1`} accent={perShareValueDay1 > issuePrice} />
            <StatBox label="Treasury reserve (post-reno)" value={`$${treasuryStakeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${treasuryShares} shares × $${perShareValueDay1.toFixed(2)}`} accent />
          </div>
          {equityBuffer <= 0 && (
            <div className="alert alert--error" style={{ marginTop: "1rem" }}>
              Post-renovation value is less than the raise amount. A good Fledge Fractals deal should have a meaningful equity buffer above cost.
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
            Monthly fixed expenses
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
                Rule of thumb: 1–2% of home value per year.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label>Rainy-day fund (% of remainder, default 10%)</label>
          <input type="number" min="0" max="100" placeholder="10" style={inputStyle} value={treasury.rainyDayPct} onChange={e => set("rainyDayPct", e.target.value)} />
        </div>
      </div>

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

  const rate = parseFloat(deal.mortgageInterestRate) || 7;
  const term = parseInt(deal.mortgageLoanTerm) || 30;
  const projection = d.postReno > 0
    ? renterEquityProjection(d.postReno, rate, term, d.shareCount)
    : [];

  const shareValue = d.shareCount > 0 ? d.postReno / d.shareCount : 0;

  // Month 1 principal for display
  const month1Principal = d.postReno > 0
    ? amortPrincipalCumulative(d.postReno, rate, term, 1)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <div>
        <span className="eyebrow">Your results</span>
        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>The full picture</h2>
        <p>Here&apos;s what the Fledge Fractals model looks like for this property.</p>
      </div>

      {/* Deal summary */}
      <div>
        <h3 style={{ fontSize: "1rem", color: "var(--color-limestone)", marginBottom: "1rem" }}>The deal</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
          <StatBox label="Total raise" value={`$${d.totalRaise.toLocaleString()}`} sub={`${d.publicShares.toLocaleString()} public shares`} />
          <StatBox label="Post-reno value" value={`$${d.postReno.toLocaleString()}`} />
          <StatBox label="Instant equity buffer" value={`$${d.equityBuffer.toLocaleString()}`} sub={`+${d.equityPct.toFixed(0)}% above cost`} accent={d.equityBuffer > 0} />
          <StatBox label="Treasury reserve" value={`${d.treasuryShares.toLocaleString()} shares`} sub={`$${d.treasuryStakeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} post-reno value`} accent />
        </div>
      </div>

      {/* Renter equity projection */}
      {projection.length > 0 && (
        <div>
          <h3 style={{ fontSize: "1rem", color: "var(--color-limestone)", marginBottom: "0.5rem" }}>Renter equity timeline</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
            At {rate}% over {term} years. The renter&apos;s first month earns <strong style={{ color: "var(--color-teal-accent)" }}>${month1Principal.toFixed(2)}</strong> in principal — with shares transferring every time they cross a 1-share ({`$${shareValue.toFixed(2)}`}) threshold.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "460px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-strong)" }}>
                  {["Year", "Shares earned", "Ownership %", "Equity value", "Cumulative principal"].map(h => (
                    <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: h === "Year" ? "left" : "right", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projection.map(({ year, sharesEarned, pctOwnership, equityValue, cumPrincipal }) => (
                  <tr key={year} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Year {year}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: sharesEarned > 0 ? "var(--color-teal-accent)" : "var(--color-text-muted)", fontWeight: sharesEarned > 0 ? 700 : 400 }}>
                      {sharesEarned.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "var(--color-text-secondary)" }}>
                      {pctOwnership.toFixed(2)}%
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "var(--color-dome-gold)", fontWeight: 600 }}>
                      ${equityValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      ${cumPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.75rem" }}>
            Note: equity values shown at post-renovation share price (${shareValue.toFixed(2)}/share). Actual value will reflect any appreciation at time of transfer.
          </p>
        </div>
      )}

      {/* Per-share story */}
      <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: "12px", padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", color: "var(--color-limestone)", marginBottom: "1.25rem" }}>What does one share mean?</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Issue price (what investors pay at launch)</span>
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
            Plus: your proportional share of any appreciation on sale — and one vote on how the surplus is used, regardless of share count.
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

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "2rem", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border-strong)", textAlign: "center" }}>
        <h3 style={{ fontSize: "1.2rem" }}>Ready to find a house?</h3>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto" }}>
          Start a project workbook to track the property, shareholders, renter equity, treasury, and generate all four documents.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/housing/projects" className="btn btn--primary">Start a workbook project →</Link>
          <Link href="/about" className="btn btn--secondary">Connect with Fledge</Link>
          <button className="btn btn--ghost" onClick={onRestart}>Model another house</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HousingPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>("intro");
  const [deal, setDeal] = useState<Deal>({
    purchasePrice: "", renovationCost: "", postRenoValue: "",
    shareCount: "1000", treasuryReservePct: "10",
    mortgageInterestRate: "7", mortgageLoanTerm: "30",
  });
  const [treasury, setTreasury] = useState<Treasury>({
    monthlyRent: "", propertyTax: "", insurance: "", maintenanceReserve: "", rainyDayPct: "10",
  });

  const stepIndex = { intro: 0, deal: 1, treasury: 2, results: 3 }[step];

  function restart() {
    setDeal({ purchasePrice: "", renovationCost: "", postRenoValue: "", shareCount: "1000", treasuryReservePct: "10", mortgageInterestRate: "7", mortgageLoanTerm: "30" });
    setTreasury({ monthlyRent: "", propertyTax: "", insurance: "", maintenanceReserve: "", rainyDayPct: "10" });
    setStep("intro");
  }

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      {/* Workbook CTA banner */}
      <div style={{ marginBottom: "2rem", padding: "1rem 1.25rem", background: session ? "rgba(46,109,164,0.1)" : "var(--color-surface)", border: `1px solid ${session ? "rgba(46,109,164,0.3)" : "var(--color-border-strong)"}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontWeight: 600, color: "var(--color-limestone)", fontSize: "0.9rem", marginBottom: "0.2rem" }}>
            {session ? "Your Fledge Fractals workbook" : "Ready to build a real project?"}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            {session
              ? "Track your property, shareholders, renter equity, treasury, and generate all four documents."
              : "Create an account to start a workbook — collect shareholders, track renter equity, manage your treasury, and generate documents."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
          <Link href="/housing/directory" className="btn btn--secondary btn--sm">Browse projects →</Link>
          <Link href={session ? "/housing/projects" : "/register"} className="btn btn--primary btn--sm">
            {session ? "My Projects →" : "Get started →"}
          </Link>
        </div>
      </div>

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

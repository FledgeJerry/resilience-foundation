"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "intro" | "situation" | "numbers" | "results";

type Situation = {
  groupSize: "1-3" | "4-8" | "9+" | "";
  hasMentor: "yes" | "no" | "unsure" | "";
  hasProperty: "yes" | "no" | "looking" | "";
};

type Numbers = {
  monthlyPayment: string;
  principalPortion: string;
  yearsPlanning: string;
  currentRent: string;
};

// ─── Pathway Logic ────────────────────────────────────────────────────────────

type Pathway = {
  name: string;
  tagline: string;
  description: string;
  forWho: string;
  nextStep: string;
  color: string;
};

const PATHWAYS: Record<string, Pathway> = {
  mentor: {
    name: "Mentor Partnership",
    tagline: "Build with a guide.",
    description: "An experienced real estate partner co-purchases with you and holds a temporary equity stake. You learn the ropes, build equity, and buy them out over time.",
    forWho: "First-time community buyers who need a financial bridge and knowledge transfer.",
    nextStep: "Connect with the Fledge Forward roster of trusted mentor partners.",
    color: "var(--color-dome-gold)",
  },
  land_contract: {
    name: "Land Contract",
    tagline: "Buy direct. No bank required.",
    description: "A direct purchase agreement between your community and a seller — no traditional mortgage needed. Payments go straight to the seller until paid in full.",
    forWho: "Communities that can't access traditional financing, or sellers willing to hold the contract.",
    nextStep: "Get legal review of contract terms. Fledge Forward can connect you to cooperative legal resources.",
    color: "var(--color-teal-accent)",
  },
  group_partnership: {
    name: "Group Partnership",
    tagline: "More people. More power.",
    description: "Four or more community members pool resources to purchase a multi-unit property. Establish the co-op legal entity before making any offer.",
    forWho: "Groups of 4–12 people ready to commit together, especially for multi-unit properties.",
    nextStep: "The Fledge provides governance structure support for group partnerships.",
    color: "var(--color-river-blue)",
  },
};

function getPathway(s: Situation): Pathway {
  if (s.hasMentor === "yes") return PATHWAYS.mentor;
  if (s.groupSize === "4-8" || s.groupSize === "9+") return PATHWAYS.group_partnership;
  return PATHWAYS.land_contract;
}

// ─── Equity Math ──────────────────────────────────────────────────────────────

function calcEquity(principal: number, years: number) {
  return [1, 3, 5, 10].map(y => ({
    year: y,
    sunshine: y <= years ? Math.round(principal * 12 * y) : null,
    rental: 0,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const steps = ["How it works", "Your situation", "The numbers", "Your results"];
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

function ChoiceButton({ label, sublabel, selected, onClick }: { label: string; sublabel?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected ? "rgba(232,200,74,0.12)" : "var(--color-surface-raised)",
        border: selected ? "1.5px solid var(--color-dome-gold)" : "1px solid var(--color-border-strong)",
        borderRadius: "8px",
        padding: "0.9rem 1.25rem",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
      }}
    >
      <span style={{ color: selected ? "var(--color-dome-gold)" : "var(--color-limestone)", fontWeight: 600, fontSize: "0.95rem" }}>{label}</span>
      {sublabel && <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>{sublabel}</span>}
    </button>
  );
}

// ─── Equity Chart (CSS bars) ──────────────────────────────────────────────────

function EquityChart({ principal, yearsPlanning, currentRent }: { principal: number; yearsPlanning: number; currentRent: number }) {
  const data = calcEquity(principal, yearsPlanning);
  const maxVal = Math.max(...data.map(d => d.sunshine ?? 0), 1);
  const totalRentSpent = Math.round(currentRent * 12 * yearsPlanning);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {data.map(({ year, sunshine }) => {
          const pct = sunshine ? Math.round((sunshine / maxVal) * 100) : 0;
          return (
            <div key={year} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "100%", height: "120px", display: "flex", alignItems: "flex-end", gap: "6px", justifyContent: "center" }}>
                {/* Sunshine House bar */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ width: "100%", height: `${pct}%`, minHeight: sunshine ? "4px" : "0", background: "var(--color-dome-gold)", borderRadius: "3px 3px 0 0", transition: "height 0.6s ease" }} />
                </div>
                {/* Standard rental bar (always $0) */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ width: "100%", height: "4px", background: "var(--color-border-strong)", borderRadius: "3px 3px 0 0" }} />
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>Year {year}</p>
                {sunshine !== null && (
                  <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-dome-gold)" }}>${sunshine.toLocaleString()}</p>
                )}
                {sunshine === null && (
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>beyond<br/>your plan</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", background: "var(--color-dome-gold)", borderRadius: "2px" }} />
          Sunshine House equity
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", background: "var(--color-border-strong)", borderRadius: "2px" }} />
          Standard rental equity ($0)
        </span>
      </div>
      {currentRent > 0 && (
        <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: "8px", padding: "0.9rem 1.1rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            In {yearsPlanning} year{yearsPlanning !== 1 ? "s" : ""} of standard renting at ${currentRent.toLocaleString()}/mo, you would spend{" "}
            <strong style={{ color: "#e07070" }}>${totalRentSpent.toLocaleString()}</strong> and own exactly <strong style={{ color: "#e07070" }}>$0</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function IntroPage({ onStart }: { onStart: () => void }) {
  const model = [
    { label: "Standard rental", desc: "You pay rent. It builds the landlord's equity. You own nothing. You can be displaced.", bad: true },
    { label: "Sunshine House", desc: "You pay rent. 100% of your principal payments build YOUR equity. You become an owner. The community owns the structure together.", bad: false },
  ];
  const rights = [
    { right: "One vote", desc: "Every renter-owner has one vote — regardless of tenure or equity amount." },
    { right: "Open books", desc: "Full access to the treasury — income, expenses, reserves, your equity balance — at any time." },
    { right: "Stability", desc: "You cannot be displaced except through a documented, democratic process with notice and appeal rights." },
    { right: "Your equity back", desc: "If you leave, your principal payments are returned to you. The house stays in community hands." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
      <div>
        <span className="eyebrow">Housing Roadmap</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>Sunshine House</h1>
        <p style={{ fontSize: "1.05rem", maxWidth: "620px" }}>
          Community-owned housing where your monthly payment builds your equity — not your landlord's. Here's how it works and how to find out if it's right for you.
        </p>
      </div>

      {/* Model comparison */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>What makes it different</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {model.map(({ label, desc, bad }) => (
            <div key={label} className="card--raised" style={{ borderLeft: `3px solid ${bad ? "rgba(192,57,43,0.6)" : "var(--color-dome-gold)"}` }}>
              <p style={{ fontWeight: 700, color: bad ? "#e07070" : "var(--color-dome-gold)", marginBottom: "0.5rem" }}>{label}</p>
              <p style={{ fontSize: "0.9rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How equity works */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>How equity works</h2>
        <p style={{ marginBottom: "1.25rem" }}>
          Your monthly payment has two parts: <strong>principal</strong> (credited to your equity account) and <strong>operating costs</strong> (mortgage interest, taxes, maintenance, reserves). The principal portion is yours.
        </p>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Year 1", formula: "Principal × 12" },
            { label: "Year 3", formula: "Principal × 36" },
            { label: "Year 5", formula: "Principal × 60" },
            { label: "Year 10", formula: "Principal × 120" },
          ].map(({ label, formula }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>{label}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--color-dome-gold)" }}>{formula}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Renter-owner rights */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>Your rights as a renter-owner</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {rights.map(({ right, desc }) => (
            <div key={right} className="card--raised" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <strong style={{ whiteSpace: "nowrap", minWidth: "100px", color: "var(--color-dome-gold)" }}>{right}</strong>
              <p style={{ fontSize: "0.9rem", margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Governance snapshot */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>How decisions get made</h2>
        <p style={{ marginBottom: "1.25rem" }}>
          The Sunshine House is governed by its renter-owners. No outside landlord. No absentee owner. The people living there run it.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {[
            { label: "Everyday decisions", value: "Simple majority — maintenance, house rules, scheduling" },
            { label: "Major decisions", value: "75% supermajority — new members, large expenses, sale" },
            { label: "Meeting cadence", value: "Monthly — open books, open agenda" },
            { label: "Disputes", value: "Peer mediation first, then community mediation" },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: "1rem" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>{label}</p>
              <p style={{ fontSize: "0.875rem" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA into wizard */}
      <div style={{ textAlign: "center", padding: "1.5rem 0 2rem", borderTop: "1px solid var(--color-border)" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>Is Sunshine House right for you?</h2>
        <p style={{ marginBottom: "1.75rem", maxWidth: "480px", margin: "0 auto 1.75rem" }}>
          Answer a few questions to find your pathway and see how much equity you could build.
        </p>
        <button className="btn btn--primary" onClick={onStart}>
          Find my pathway →
        </button>
      </div>
    </div>
  );
}

function SituationPage({ situation, setSituation, onNext, onBack }: {
  situation: Situation;
  setSituation: (s: Situation) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = (key: keyof Situation, val: string) => setSituation({ ...situation, [key]: val as never });
  const canContinue = situation.groupSize && situation.hasMentor && situation.hasProperty;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <span className="eyebrow">Step 1 of 3</span>
        <h2 style={{ fontSize: "1.6rem" }}>Your situation</h2>
        <p>A few quick questions to point you to the right pathway.</p>
      </div>

      <div>
        <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "0.75rem" }}>How many people are interested in joining?</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {[
            { val: "1-3", label: "1–3 people", sub: "Small household or couple" },
            { val: "4-8", label: "4–8 people", sub: "Small group or multi-unit" },
            { val: "9+", label: "9 or more", sub: "Larger cooperative housing" },
          ].map(({ val, label, sub }) => (
            <ChoiceButton key={val} label={label} sublabel={sub} selected={situation.groupSize === val} onClick={() => set("groupSize", val)} />
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "0.75rem" }}>Do you have access to a credit-qualified co-buyer or real estate mentor?</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {[
            { val: "yes", label: "Yes", sub: "Someone willing to co-purchase" },
            { val: "no", label: "No", sub: "Going it without one" },
            { val: "unsure", label: "Not sure", sub: "Open to the idea" },
          ].map(({ val, label, sub }) => (
            <ChoiceButton key={val} label={label} sublabel={sub} selected={situation.hasMentor === val} onClick={() => set("hasMentor", val)} />
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "0.75rem" }}>Is there a specific property you&apos;re looking at?</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {[
            { val: "yes", label: "Yes", sub: "We have a property in mind" },
            { val: "looking", label: "Still looking", sub: "Actively searching" },
            { val: "no", label: "Not yet", sub: "Just starting to explore" },
          ].map(({ val, label, sub }) => (
            <ChoiceButton key={val} label={label} sublabel={sub} selected={situation.hasProperty === val} onClick={() => set("hasProperty", val)} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", paddingTop: "0.5rem" }}>
        <button className="btn btn--ghost" onClick={onBack}>← Back</button>
        <button className="btn btn--primary" disabled={!canContinue} onClick={onNext}>Continue →</button>
      </div>
    </div>
  );
}

function NumbersPage({ numbers, setNumbers, onNext, onBack }: {
  numbers: Numbers;
  setNumbers: (n: Numbers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = (key: keyof Numbers, val: string) => setNumbers({ ...numbers, [key]: val });
  const canContinue = numbers.monthlyPayment && numbers.principalPortion && numbers.yearsPlanning;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <span className="eyebrow">Step 2 of 3</span>
        <h2 style={{ fontSize: "1.6rem" }}>The numbers</h2>
        <p>Enter your estimated figures and we&apos;ll show you what you could build.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "480px" }}>
        <div>
          <label>Expected monthly housing payment ($)</label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 800"
            style={inputStyle}
            value={numbers.monthlyPayment}
            onChange={e => set("monthlyPayment", e.target.value)}
          />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            Use your target monthly payment or current local fair market rent.
          </p>
        </div>

        <div>
          <label>Principal portion per month ($)</label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 280"
            style={inputStyle}
            value={numbers.principalPortion}
            onChange={e => set("principalPortion", e.target.value)}
          />
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
            The portion that goes to paying down the mortgage principal — typically 30–40% of the payment. This is the amount credited to your equity each month.
          </p>
        </div>

        <div>
          <label>How many years do you plan to stay?</label>
          <input
            type="number"
            min="1"
            max="30"
            placeholder="e.g. 5"
            style={inputStyle}
            value={numbers.yearsPlanning}
            onChange={e => set("yearsPlanning", e.target.value)}
          />
        </div>

        <div>
          <label>Your current monthly rent (optional — for comparison)</label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 950"
            style={inputStyle}
            value={numbers.currentRent}
            onChange={e => set("currentRent", e.target.value)}
          />
        </div>
      </div>

      <div style={{ background: "rgba(232,200,74,0.07)", border: "1px solid rgba(232,200,74,0.2)", borderRadius: "8px", padding: "1rem 1.25rem", maxWidth: "480px" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
          <strong>Note:</strong> These are illustrative figures based on your inputs. Actual Sunshine House numbers depend on the specific property and financing structure. The Fledge Forward team can give you real numbers for a specific house.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button className="btn btn--ghost" onClick={onBack}>← Back</button>
        <button className="btn btn--primary" disabled={!canContinue} onClick={onNext}>See my results →</button>
      </div>
    </div>
  );
}

function ResultsPage({ situation, numbers, onRestart }: {
  situation: Situation;
  numbers: Numbers;
  onRestart: () => void;
}) {
  const principal = parseFloat(numbers.principalPortion) || 0;
  const years = parseInt(numbers.yearsPlanning) || 5;
  const currentRent = parseFloat(numbers.currentRent) || 0;
  const totalEquity = Math.round(principal * 12 * years);
  const pathway = getPathway(situation);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <div>
        <span className="eyebrow">Your results</span>
        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>Here&apos;s what you could build</h2>
        <p>Based on {numbers.yearsPlanning} year{parseInt(numbers.yearsPlanning) !== 1 ? "s" : ""} in a Sunshine House at ${parseFloat(numbers.principalPortion).toLocaleString()}/month in principal.</p>
      </div>

      {/* Hero number */}
      <div style={{ textAlign: "center", padding: "2rem", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border-strong)" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
          Equity after {years} year{years !== 1 ? "s" : ""}
        </p>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.5rem, 6vw, 4rem)", color: "var(--color-dome-gold)", fontWeight: 700, lineHeight: 1, marginBottom: "0.5rem" }}>
          ${totalEquity.toLocaleString()}
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
          In a standard rental: <strong style={{ color: "#e07070" }}>$0</strong>
        </p>
      </div>

      {/* Chart */}
      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: "1.25rem", color: "var(--color-limestone)" }}>Equity over time</h3>
        <EquityChart principal={principal} yearsPlanning={years} currentRent={currentRent} />
      </div>

      {/* Recommended pathway */}
      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--color-limestone)" }}>Your recommended pathway</h3>
        <div className="card--raised" style={{ borderLeft: `3px solid ${pathway.color}` }}>
          <p style={{ fontWeight: 700, fontSize: "1.1rem", color: pathway.color, marginBottom: "0.25rem" }}>{pathway.name}</p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontStyle: "italic", marginBottom: "0.75rem" }}>{pathway.tagline}</p>
          <p style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>{pathway.description}</p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            <strong>For who:</strong> {pathway.forWho}
          </p>
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>Next step</p>
            <p style={{ fontSize: "0.9rem" }}>{pathway.nextStep}</p>
          </div>
        </div>
      </div>

      {/* Three pathways overview */}
      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--color-limestone)" }}>All three pathways</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Object.values(PATHWAYS).map(p => (
            <div key={p.name} className="card" style={{ padding: "1rem 1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color, flexShrink: 0, marginTop: "5px" }} />
              <div>
                <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "0.2rem" }}>{p.name}</p>
                <p style={{ fontSize: "0.85rem" }}>{p.forWho}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "2rem", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border-strong)", textAlign: "center" }}>
        <h3 style={{ fontSize: "1.2rem" }}>Ready to take the next step?</h3>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto" }}>
          Connect with the Fledge Forward team to get real numbers for a specific property and find your path to ownership.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/about" className="btn btn--primary">Connect with Fledge Forward</Link>
          <button className="btn btn--ghost" onClick={onRestart}>Start over</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HousingPage() {
  const [step, setStep] = useState<Step>("intro");
  const [situation, setSituation] = useState<Situation>({ groupSize: "", hasMentor: "", hasProperty: "" });
  const [numbers, setNumbers] = useState<Numbers>({ monthlyPayment: "", principalPortion: "", yearsPlanning: "", currentRent: "" });

  const stepIndex = { intro: 0, situation: 1, numbers: 2, results: 3 }[step];

  function restart() {
    setSituation({ groupSize: "", hasMentor: "", hasProperty: "" });
    setNumbers({ monthlyPayment: "", principalPortion: "", yearsPlanning: "", currentRent: "" });
    setStep("intro");
  }

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <ProgressBar step={stepIndex} />

      {step === "intro" && <IntroPage onStart={() => setStep("situation")} />}
      {step === "situation" && (
        <SituationPage
          situation={situation}
          setSituation={setSituation}
          onNext={() => setStep("numbers")}
          onBack={() => setStep("intro")}
        />
      )}
      {step === "numbers" && (
        <NumbersPage
          numbers={numbers}
          setNumbers={setNumbers}
          onNext={() => setStep("results")}
          onBack={() => setStep("situation")}
        />
      )}
      {step === "results" && (
        <ResultsPage situation={situation} numbers={numbers} onRestart={restart} />
      )}
    </div>
  );
}

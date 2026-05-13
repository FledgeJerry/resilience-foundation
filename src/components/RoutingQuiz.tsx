"use client";

import { useState } from "react";
import Link from "next/link";

type Urgency = "housing" | "income" | "food" | "starting" | "learning" | "";
type Location = "lansing" | "other" | "exploring" | "";

const URGENCY_OPTIONS = [
  { val: "housing" as Urgency, label: "Housing", sub: "Finding or securing stable, affordable housing" },
  { val: "income" as Urgency, label: "Work & income", sub: "Building a business where the workers own it" },
  { val: "food" as Urgency, label: "Food & basics", sub: "Food, healthcare, and immediate needs" },
  { val: "starting" as Urgency, label: "Starting something", sub: "An idea I want to build into a real thing" },
  { val: "learning" as Urgency, label: "Learning", sub: "Research, data, and understanding the model" },
];

const LOCATION_OPTIONS = [
  { val: "lansing" as Location, label: "Lansing, MI", sub: "I'm local to the Lansing area" },
  { val: "other" as Location, label: "Another city", sub: "I want to build this somewhere else" },
  { val: "exploring" as Location, label: "Just exploring", sub: "Curious, no specific location yet" },
];

type NodeResult = {
  name: string;
  desc: string;
  href: string;
  live: boolean;
  callout?: string;
};

function getResult(urgency: Urgency, location: Location): NodeResult {
  const lansing = location === "lansing";
  const other = location === "other";

  const results: Record<NonNullable<typeof urgency>, NodeResult> = {
    housing: {
      name: "Fledge Fractals",
      desc: "Community-owned housing where your rent builds real equity shares through amortization math — the same equity you'd earn paying a 30-year mortgage. Use the pathway finder to see which model fits you.",
      href: "/housing",
      live: true,
      callout: lansing
        ? "The Fledge is based in Lansing and works directly with Fledge Fractals candidates here."
        : other
        ? "The Fledge Fractals model is designed to be replicated anywhere. Check Replicate It for the full playbook."
        : undefined,
    },
    income: {
      name: "Worker Co-op Builder",
      desc: "Build a business where the workers own it. Start with the co-op explainer, then use the 13-section handbook to take your founding group from idea to business plan.",
      href: "/co-op",
      live: true,
      callout: lansing
        ? "The Fledge in Lansing provides direct co-op coaching, workspace, and a network of worker-owners."
        : other
        ? "Everything in the handbook works wherever you are. The Replicate It playbook has city-by-city guidance."
        : undefined,
    },
    food: {
      name: "Basic Needs Map",
      desc: "Find Free Stands, food pantries, healthcare, and other immediate resources near you. A live map updated by the community.",
      href: "/needs",
      live: false,
      callout: lansing
        ? "Lansing has an active Free Stand network operated by The Fledge — check back soon for the live map."
        : undefined,
    },
    starting: {
      name: "Entrepreneurial Journey",
      desc: "Eight stages from idea to co-op — live now. Track your business across Idea, Know Your Ground, Find Your People, Build Structure, Test Small, Get Support, Sustain It, and Grow the Ecosystem. At Stage 4 you can fork into the traditional path or the co-op path.",
      href: "/journey",
      live: true,
      callout: lansing
        ? "The Fledge runs a 90-day cohort program for early-stage co-ops in Lansing."
        : other
        ? "The Journey framework is city-agnostic. The Replicate It playbook helps you build local support infrastructure."
        : undefined,
    },
    learning: {
      name: "Research + Benchmarks",
      desc: "ALICE data, co-op outcomes, living wage index, and community ownership models. Understand the ground before you build on it.",
      href: "/research",
      live: false,
    },
    "": {
      name: "",
      desc: "",
      href: "/",
      live: false,
    },
  };

  return results[urgency || ""];
}

function QuizButton({ label, sub, selected, onClick }: { label: string; sub: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected ? "rgba(232,200,74,0.1)" : "var(--color-surface-raised)",
        border: selected ? "1.5px solid var(--color-dome-gold)" : "1px solid var(--color-border-strong)",
        borderRadius: "8px",
        padding: "0.9rem 1.25rem",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
        width: "100%",
      }}
    >
      <span style={{ color: selected ? "var(--color-dome-gold)" : "var(--color-limestone)", fontWeight: 600, fontSize: "0.95rem" }}>{label}</span>
      <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>{sub}</span>
    </button>
  );
}

export default function RoutingQuiz() {
  const [urgency, setUrgency] = useState<Urgency>("");
  const [location, setLocation] = useState<Location>("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const result = getResult(urgency, location);

  function reset() {
    setUrgency("");
    setLocation("");
    setStep(1);
  }

  return (
    <div style={{ maxWidth: "640px" }}>
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ fontWeight: 600, color: "var(--color-limestone)", fontSize: "1rem" }}>
            What&apos;s most urgent for you right now?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {URGENCY_OPTIONS.map(({ val, label, sub }) => (
              <QuizButton
                key={val}
                label={label}
                sub={sub}
                selected={urgency === val}
                onClick={() => setUrgency(val)}
              />
            ))}
          </div>
          <button
            className="btn btn--primary"
            disabled={!urgency}
            onClick={() => setStep(2)}
            style={{ alignSelf: "flex-start" }}
          >
            Continue &rarr;
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ fontWeight: 600, color: "var(--color-limestone)", fontSize: "1rem" }}>
            Where are you building?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {LOCATION_OPTIONS.map(({ val, label, sub }) => (
              <QuizButton
                key={val}
                label={label}
                sub={sub}
                selected={location === val}
                onClick={() => setLocation(val)}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn--ghost" onClick={() => setStep(1)}>&larr; Back</button>
            <button
              className="btn btn--primary"
              disabled={!location}
              onClick={() => setStep(3)}
            >
              See my path &rarr;
            </button>
          </div>
        </div>
      )}

      {step === 3 && urgency && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            className="card--raised"
            style={{ borderLeft: "3px solid var(--color-dome-gold)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-limestone)" }}>{result.name}</p>
              {!result.live && (
                <span className="badge badge--muted">Coming soon</span>
              )}
              {result.live && (
                <span className="badge badge--gold">Live now</span>
              )}
            </div>
            <p style={{ fontSize: "0.9rem", marginBottom: result.callout ? "1rem" : "1.25rem" }}>{result.desc}</p>
            {result.callout && (
              <div style={{
                background: "rgba(46,109,164,0.12)",
                border: "1px solid rgba(46,109,164,0.25)",
                borderRadius: "6px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
              }}>
                <p style={{ fontSize: "0.85rem", color: "#7DB8E8" }}>{result.callout}</p>
              </div>
            )}
            {result.live ? (
              <Link href={result.href} className="btn btn--primary btn--sm">Go to {result.name} &rarr;</Link>
            ) : (
              <Link href="/" className="btn btn--ghost btn--sm">Explore all nodes &rarr;</Link>
            )}
          </div>
          <button
            onClick={reset}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.85rem", textAlign: "left", padding: 0 }}
          >
            &larr; Start over
          </button>
        </div>
      )}
    </div>
  );
}

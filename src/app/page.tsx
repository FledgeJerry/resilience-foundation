import Link from "next/link";
import RoutingQuiz from "@/components/RoutingQuiz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const NODES = [
  {
    num: 1,
    abbr: "COOP",
    name: "Worker Co-op Builder",
    desc: "Co-op legal templates, handbook, and democratic governance. Build the structure that makes your work yours.",
    href: "/co-op",
    live: true,
    highlight: false,
  },
  {
    num: 2,
    abbr: "HSG",
    name: "Housing Roadmap",
    desc: "Fledge Fractals — renter-centric community housing where your rent builds real equity shares. Stop paying someone else's mortgage.",
    href: "/housing",
    live: true,
    highlight: true,
  },
  {
    num: 3,
    abbr: "MAP",
    name: "Basic Needs Map",
    desc: "Free Stands, food, healthcare, and live resource maps. Know what's available right now.",
    href: "/needs",
    live: false,
    highlight: false,
  },
  {
    num: 4,
    abbr: "JRNY",
    name: "Entrepreneurial Journey",
    desc: "Eight stages from idea to co-op. Tools, the Fledge pathway, and peer support at every step.",
    href: "/journey",
    live: true,
    highlight: true,
  },
  {
    num: 5,
    abbr: "COPY",
    name: "Replicate It",
    desc: "Open-source playbook for building Crash Out in your city. Everything we've built, yours to use.",
    href: "/replicate",
    live: false,
    highlight: false,
  },
  {
    num: 6,
    abbr: "DATA",
    name: "Research + Benchmarks",
    desc: "ALICE data, co-op outcomes, and living wage index. Know your ground before you build.",
    href: "/research",
    live: false,
    highlight: false,
  },
  {
    num: 7,
    abbr: "GOV",
    name: "Governance Library",
    desc: "Bylaws, ICA principles, voting models, and AI governance. Govern democratically from day one.",
    href: "/governance",
    live: false,
    highlight: false,
  },
  {
    num: 8,
    abbr: "PLSE",
    name: "Crash Out Pulse",
    desc: "Daily podcast feed, episodes, and guests. Hear from people already building.",
    href: "/pulse",
    live: false,
    highlight: false,
  },
];

async function getCommunityStats() {
  const [entrepreneurCount, coopBusinessCount, publicCoopCount, housingCount, recentEntrepreneurs, recentCoops, recentHousing] = await Promise.all([
    prisma.business.count({ where: { type: { not: "COOP" } } }),
    prisma.business.count({ where: { type: "COOP" } }),
    prisma.coop.count({ where: { isPublic: true } }),
    prisma.housingProject.count(),
    prisma.business.findMany({
      where: { type: { not: "COOP" } },
      select: { id: true, name: true, type: true, stage: true, city: true, state: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.coop.findMany({
      where: { isPublic: true },
      select: {
        id: true, name: true, city: true, state: true,
        handbookEntries: { where: { fieldId: "FM-02" }, select: { value: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.housingProject.findMany({
      select: { id: true, name: true, status: true, city: true, state: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return {
    entrepreneurCount,
    coopCount: coopBusinessCount + publicCoopCount,
    housingCount,
    recentEntrepreneurs,
    recentCoops: recentCoops.map(c => ({
      ...c,
      tagline: c.handbookEntries[0]?.value ?? null,
      handbookEntries: undefined,
    })),
    recentHousing,
  };
}

const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea", KNOW_GROUND: "Know the Ground", FIND_PEOPLE: "Find People",
  BUILD_STRUCTURE: "Build Structure", TEST_SMALL: "Test Small", GET_SUPPORT: "Get Support",
  SUSTAIN: "Sustain", GROW: "Grow",
};

const HOUSING_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning", RAISING: "Raising", PURCHASED: "Purchased",
  RENOVATING: "Renovating", RENTING: "Renting", SOLD: "Sold",
};

export default async function Home() {
  const community = await getCommunityStats();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5rem" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "4rem 0 2rem", textAlign: "center" }}>
        <span className="eyebrow">Crash Out: A Resiliency Hub</span>
        <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 3.75rem)", lineHeight: 1.15, marginBottom: "1.25rem" }}>
          Build what<br />takes care of us.
        </h1>
        <p style={{
          fontSize: "clamp(1rem, 2vw, 1.2rem)",
          maxWidth: "580px",
          margin: "0 auto 2.25rem",
          color: "var(--color-text-secondary)",
          lineHeight: 1.7,
        }}>
          A living roadmap and working toolkit for ALICE households and community
          organizers — eight interconnected paths to ownership, stability, and
          shared power.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#quiz" className="btn btn--primary">Where do I start?</a>
          <a href="#nodes" className="btn btn--secondary">See how it works</a>
        </div>
      </section>

      {/* ── Routing Quiz ─────────────────────────────────────────────────── */}
      <section id="quiz" style={{ scrollMarginTop: "80px" }}>
        <span className="eyebrow">Find your path</span>
        <h2 style={{ marginBottom: "1.5rem" }}>Where do you want to start?</h2>
        <RoutingQuiz />
      </section>

      <hr className="divider" />

      {/* ── What This Is ─────────────────────────────────────────────────── */}
      <section>
        <span className="eyebrow">What this is</span>
        <h2 style={{ marginBottom: "1.5rem", maxWidth: "560px" }}>
          Not a brochure. A living roadmap.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "700px" }}>
          <p>
            Crash Out is built for two kinds of people. An ALICE household —
            Asset Limited, Income Constrained, Employed — who is doing everything
            right and still falling behind. And a community organizer who wants
            to build something permanent in their city, not just another program
            that runs out of grant money.
          </p>
          <p>
            Every node on this platform is a working tool, not an explainer. You
            can use the Housing Roadmap to find your acquisition pathway today.
            You can start your co-op handbook right now and generate a real
            business plan. The Entrepreneurial Journey is live — track your
            progress across eight stages and get matched with peer support and
            Fledge coaching.
          </p>
          <p>
            The value created here stays here. Co-ops buy from co-ops. Community
            land trusts keep housing in community hands. The Fledge in Lansing
            is the first node in a network designed to replicate itself wherever
            people decide they&apos;re done waiting for someone else to fix things.
          </p>
          <p style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>
            &ldquo;The most radical thing we can do is build something we actually own.&rdquo;
          </p>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Eight Nodes ──────────────────────────────────────────────────── */}
      <section id="nodes" style={{ scrollMarginTop: "80px" }}>
        <span className="eyebrow">The eight nodes</span>
        <h2 style={{ marginBottom: "0.5rem" }}>Eight paths. One platform.</h2>
        <p style={{ marginBottom: "2.5rem", maxWidth: "560px" }}>
          Each node is a self-contained module — you can enter at any point. Three
          are live now; the rest are in active development.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
        }}>
          {NODES.map(({ num, abbr, name, desc, href, live, highlight }) => (
            <div
              key={num}
              className={highlight ? "card--raised" : "card"}
              style={{
                borderLeft: highlight ? "3px solid var(--color-dome-gold)" : undefined,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                position: "relative",
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{
                  background: highlight ? "var(--color-dome-gold)" : "var(--color-river-blue)",
                  color: highlight ? "var(--color-midnight-steel)" : "var(--color-limestone)",
                  borderRadius: "4px",
                  padding: "2px 7px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-sans)",
                  flexShrink: 0,
                }}>
                  {abbr}
                </div>
                {!live && <span className="badge badge--muted" style={{ marginLeft: "auto" }}>Coming soon</span>}
                {live && <span className="badge badge--gold" style={{ marginLeft: "auto" }}>Live</span>}
              </div>

              {/* Name */}
              <p style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: "1rem",
                color: highlight ? "var(--color-dome-gold)" : "var(--color-limestone)",
                lineHeight: 1.3,
              }}>
                {name}
              </p>

              {/* Description */}
              <p style={{ fontSize: "0.875rem", flex: 1 }}>{desc}</p>

              {/* CTA */}
              <Link
                href={href}
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: live
                    ? (highlight ? "var(--color-dome-gold)" : "var(--color-river-blue)")
                    : "var(--color-text-muted)",
                  textDecoration: "none",
                  alignSelf: "flex-start",
                }}
              >
                {live ? "Enter →" : "Learn more →"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Community ────────────────────────────────────────────────────── */}
      <hr className="divider" />

      <section>
        <span className="eyebrow">What we&apos;re building</span>
        <h2 style={{ marginBottom: "0.5rem" }}>The community in motion</h2>
        <p style={{ marginBottom: "2.5rem", maxWidth: "560px", color: "var(--color-text-secondary)" }}>
          Entrepreneurs on the journey, worker-owned co-ops, and housing projects — all in progress right now.
        </p>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { label: "Entrepreneurs", count: community.entrepreneurCount, href: "/entrepreneurs" },
            { label: "Worker Co-ops", count: community.coopCount, href: "/directory" },
            { label: "Housing Projects", count: community.housingCount, href: "/housing/directory" },
          ].map(({ label, count, href }) => (
            <Link key={label} href={href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ textAlign: "center", padding: "1.25rem 1rem", cursor: "pointer" }}>
                <p style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.25rem", color: "var(--color-dome-gold)", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                  {count}
                </p>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-muted)", margin: 0 }}>
                  {label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Three columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem" }}>

          {/* Entrepreneurs */}
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
              Recent entrepreneurs
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {community.recentEntrepreneurs.map((b) => (
                <div key={b.id} style={{ padding: "0.65rem 0.9rem", background: "var(--color-surface-raised)", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--color-limestone)" }}>{b.name}</p>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                    {STAGE_LABELS[b.stage] ?? b.stage}
                    {b.city && ` · ${b.city}${b.state ? `, ${b.state}` : ""}`}
                  </p>
                </div>
              ))}
              {community.recentEntrepreneurs.length === 0 && (
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>No businesses yet.</p>
              )}
            </div>
            {community.entrepreneurCount > 4 && (
              <Link href="/entrepreneurs" style={{ fontSize: "0.78rem", color: "var(--color-river-blue)", display: "block", marginTop: "0.6rem" }}>
                View all {community.entrepreneurCount} →
              </Link>
            )}
          </div>

          {/* Co-ops */}
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
              Worker-owned co-ops
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {community.recentCoops.map((c) => (
                <div key={c.id} style={{ padding: "0.65rem 0.9rem", background: "var(--color-surface-raised)", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--color-limestone)" }}>{c.name}</p>
                  {c.tagline && <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "var(--color-text-muted)", lineHeight: 1.4 }}>{c.tagline}</p>}
                  {!c.tagline && c.city && <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{c.city}{c.state ? `, ${c.state}` : ""}</p>}
                </div>
              ))}
              {community.recentCoops.length === 0 && (
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>No public co-ops listed yet.</p>
              )}
            </div>
            {community.coopCount > 4 && (
              <Link href="/directory" style={{ fontSize: "0.78rem", color: "var(--color-river-blue)", display: "block", marginTop: "0.6rem" }}>
                View all {community.coopCount} →
              </Link>
            )}
          </div>

          {/* Housing */}
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
              Housing projects
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {community.recentHousing.map((h) => (
                <div key={h.id} style={{ padding: "0.65rem 0.9rem", background: "var(--color-surface-raised)", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--color-limestone)" }}>{h.name}</p>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                    {HOUSING_STATUS_LABELS[h.status] ?? h.status}
                    {h.city && ` · ${h.city}${h.state ? `, ${h.state}` : ""}`}
                  </p>
                </div>
              ))}
              {community.recentHousing.length === 0 && (
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>No housing projects yet.</p>
              )}
            </div>
            {community.housingCount > 4 && (
              <Link href="/housing/directory" style={{ fontSize: "0.78rem", color: "var(--color-river-blue)", display: "block", marginTop: "0.6rem" }}>
                View all {community.housingCount} →
              </Link>
            )}
          </div>

        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: "center", padding: "2rem 0 3rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Start where you are.</h2>
        <p style={{ marginBottom: "2rem", maxWidth: "480px", margin: "0 auto 2rem", color: "var(--color-text-secondary)" }}>
          Three nodes are live now — free to explore, no account required.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/journey" className="btn btn--primary">Entrepreneurial Journey</Link>
          <Link href="/co-op" className="btn btn--secondary">Co-op Builder</Link>
          <Link href="/housing" className="btn btn--secondary">Fledge Fractals</Link>
        </div>
      </section>

    </div>
  );
}

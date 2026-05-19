import Link from "next/link";

const DATASETS = [
  {
    title: "ALICE Households",
    stat: "42%",
    desc: "of Michigan households are ALICE or below the poverty line — Asset Limited, Income Constrained, Employed. Doing everything right, still falling behind.",
    source: "United Way ALICE Report",
  },
  {
    title: "Co-op survival rate",
    stat: "3× higher",
    desc: "Worker co-ops survive their first 5 years at nearly three times the rate of conventional businesses.",
    source: "US Federation of Worker Cooperatives",
  },
  {
    title: "Wealth gap — renters vs owners",
    stat: "$255K",
    desc: "Median net worth of homeowners vs. $6,300 for renters. The gap compounds every decade a household is locked out of ownership.",
    source: "Federal Reserve Survey of Consumer Finances",
  },
  {
    title: "Lansing median household income",
    stat: "$38K",
    desc: "Lansing's median income is well below the state average, and the living wage for a family of four exceeds $80K. The gap is structural, not behavioral.",
    source: "Census ACS / MIT Living Wage Calculator",
  },
];

const UPCOMING = [
  "ALICE index by zip code — searchable map for Lansing and mid-Michigan",
  "Co-op outcomes tracker — jobs created, wages, and longevity for all Fledge co-ops",
  "Living wage calculator — what it actually costs to live in Lansing",
  "Housing cost burden by neighborhood — percent of income spent on rent",
  "Redlining legacy overlay — historical exclusion zones mapped to current wealth data",
];

export default function ResearchPage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3rem" }}>

      <div>
        <span className="eyebrow">Node 6 — Research + Benchmarks</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>
          Know your ground before you build.
        </h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "600px", marginBottom: "1.5rem" }}>
          The data behind the Crash Out model. Not to explain the problem — to give organizers, co-op founders, and policymakers the numbers they need to make the case and track progress.
        </p>
        <div className="alert" style={{ background: "rgba(46,109,164,0.08)", border: "1px solid rgba(46,109,164,0.25)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
          <p style={{ fontWeight: 700, color: "var(--color-river-blue)", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
            In development
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            Full data dashboards and the outcomes tracker are in progress. Key benchmarks are shown below.
          </p>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>Key benchmarks</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {DATASETS.map(({ title, stat, desc, source }) => (
            <div key={title} className="card--raised" style={{ borderLeft: "3px solid var(--color-dome-gold)" }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, color: "var(--color-dome-gold)", lineHeight: 1, marginBottom: "0.4rem" }}>
                {stat}
              </p>
              <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.4rem", fontSize: "0.95rem" }}>{title}</p>
              <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>{desc}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>Source: {source}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Coming to this node</h2>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", paddingLeft: 0, listStyle: "none" }}>
          {UPCOMING.map((item) => (
            <li key={item} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--color-dome-gold)", flexShrink: 0, marginTop: "0.1rem" }}>→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "12px", padding: "1.75rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Help us build the data layer</h2>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
          If you work in civic data, research, or policy and want to contribute datasets or analysis, reach out.
        </p>
        <a href="mailto:jerry@thefledge.com" className="btn btn--primary">Get in touch</a>
      </div>

      <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>&larr; Back to all nodes</Link>
      </div>
    </div>
  );
}

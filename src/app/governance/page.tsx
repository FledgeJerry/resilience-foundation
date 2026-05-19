import Link from "next/link";

const LIBRARY_ITEMS = [
  {
    category: "Governing documents",
    items: ["Articles of incorporation (worker co-op template)", "Operating agreement / bylaws", "Member handbook template", "Conflict of interest policy"],
  },
  {
    category: "ICA Principles",
    items: ["Voluntary & open membership", "Democratic member control", "Member economic participation", "Autonomy & independence", "Education, training & information", "Cooperation among cooperatives", "Concern for community"],
  },
  {
    category: "Voting models",
    items: ["One member, one vote (standard co-op)", "Weighted preference voting", "Consent-based governance (sociocracy)", "Multi-stakeholder co-op structures"],
  },
  {
    category: "AI governance",
    items: ["Policy for AI tool use in co-op operations", "Data ownership and member privacy", "AI-assisted document generation disclosure", "Algorithmic decision-making accountability"],
  },
];

export default function GovernancePage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3rem" }}>

      <div>
        <span className="eyebrow">Node 7 — Governance Library</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>
          Govern democratically from day one.
        </h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "600px", marginBottom: "1.5rem" }}>
          Ready-to-use bylaws, member agreements, voting models, and governance frameworks — designed for co-ops, community land trusts, and mutual aid organizations. Including a framework for AI governance that most co-ops don&apos;t know they need yet.
        </p>
        <div className="alert" style={{ background: "rgba(46,109,164,0.08)", border: "1px solid rgba(46,109,164,0.25)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
          <p style={{ fontWeight: 700, color: "var(--color-river-blue)", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
            In development
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            The governance library is being built. The co-op handbook (Node 1) already includes governance sections — this node will go deeper with downloadable templates and interactive document generators.
          </p>
        </div>
      </div>

      <div style={{ background: "rgba(74,155,142,0.08)", border: "1px solid rgba(74,155,142,0.2)", borderRadius: "10px", padding: "1.25rem 1.5rem" }}>
        <p style={{ fontWeight: 700, color: "var(--color-teal-accent)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
          Start now with the Co-op Builder
        </p>
        <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
          Node 1 (Worker Co-op Builder) is live and includes a 13-section handbook with governance, voting, and member agreement sections. It generates real documents using your co-op&apos;s information.
        </p>
        <Link href="/co-op" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-teal-accent)", textDecoration: "none" }}>
          Open the Co-op Builder &rarr;
        </Link>
      </div>

      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>What&apos;s coming in this library</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {LIBRARY_ITEMS.map(({ category, items }) => (
            <div key={category} className="card--raised">
              <p style={{ fontWeight: 700, color: "var(--color-dome-gold)", marginBottom: "0.75rem", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {category}
              </p>
              <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {items.map((item) => (
                  <li key={item} style={{ fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <span style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "12px", padding: "1.75rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Have governance documents to contribute?</h2>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
          If you have co-op bylaws, voting procedures, or governance models that have worked in practice and want to add them to the library, reach out.
        </p>
        <a href="mailto:jerry@thefledge.com" className="btn btn--primary">Contribute to the library</a>
      </div>

      <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>&larr; Back to all nodes</Link>
      </div>
    </div>
  );
}

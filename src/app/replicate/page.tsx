import Link from "next/link";

const TOOLKIT_ITEMS = [
  {
    title: "Platform source code",
    desc: "The full resilience.foundation codebase — every node, API, and document generator. Fork it, host it, rename it, build on it.",
    tag: "GitHub",
  },
  {
    title: "Co-op formation playbook",
    desc: "Step-by-step from concept to registered entity in your state. Templates for all 50 states, common mistakes, and first-year survival guide.",
    tag: "Document",
  },
  {
    title: "Sunshine House deal template",
    desc: "Share offering documents, member agreements, governance framework, and treasury model — ready to adapt for your first community housing project.",
    tag: "Templates",
  },
  {
    title: "Free Stand setup guide",
    desc: "How to build and stock a community free stand. Sourcing, siting, community management, and how to connect it to the Basic Needs Map.",
    tag: "Guide",
  },
  {
    title: "Community organizing curriculum",
    desc: "The Fledge's organizing model — how to build trust, recruit members, run productive meetings, and make decisions democratically.",
    tag: "Curriculum",
  },
  {
    title: "City activation checklist",
    desc: "Everything you need to launch a Crash Out hub in your city: partners, registrations, first events, early co-op incubation, and metrics.",
    tag: "Checklist",
  },
];

export default function ReplicatePage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3rem" }}>

      <div>
        <span className="eyebrow">Node 5 — Replicate It</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>
          Build Crash Out in your city.
        </h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "600px", marginBottom: "1.5rem" }}>
          Everything we built in Lansing is open-source and replicable. The model isn&apos;t a franchise — it&apos;s a toolkit. Take what works, adapt what doesn&apos;t, and build something your community actually owns.
        </p>
        <div className="alert" style={{ background: "rgba(46,109,164,0.08)", border: "1px solid rgba(46,109,164,0.25)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
          <p style={{ fontWeight: 700, color: "var(--color-river-blue)", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
            In development
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            The replication toolkit is being assembled. Everything below is planned for this node — reach out if you&apos;re ready to build now.
          </p>
        </div>
      </div>

      <div style={{ background: "rgba(74,155,142,0.08)", border: "1px solid rgba(74,155,142,0.2)", borderRadius: "12px", padding: "1.5rem" }}>
        <p style={{ fontWeight: 700, color: "var(--color-teal-accent)", marginBottom: "0.5rem" }}>
          Open source by design
        </p>
        <p style={{ fontSize: "0.9rem", maxWidth: "600px" }}>
          This platform is licensed CC BY-SA. Use it, modify it, redistribute it — as long as derivatives stay open. The goal is a network of city-level hubs that share resources, trade with each other, and build collective power across geographies.
        </p>
      </div>

      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>What&apos;s in the toolkit</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {TOOLKIT_ITEMS.map(({ title, desc, tag }) => (
            <div key={title} className="card--raised">
              <span style={{
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "var(--color-text-muted)", background: "var(--color-surface)", border: "1px solid var(--color-border-strong)",
                borderRadius: "4px", padding: "2px 7px", display: "inline-block", marginBottom: "0.6rem",
              }}>{tag}</span>
              <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.4rem", fontSize: "0.95rem" }}>{title}</p>
              <p style={{ fontSize: "0.85rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "12px", padding: "1.75rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Ready to build in your city?</h2>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
          We&apos;re actively supporting the first wave of city replicators. If you have a community anchor and you&apos;re serious, let&apos;s talk.
        </p>
        <a href="mailto:jerry@thefledge.com" className="btn btn--primary">Start the conversation</a>
      </div>

      <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>&larr; Back to all nodes</Link>
      </div>
    </div>
  );
}

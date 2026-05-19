import Link from "next/link";

const SAMPLE_EPISODES = [
  {
    num: "01",
    title: "Why co-ops win when markets fail",
    guest: "Jerry Norris, The Fledge",
    topic: "Community wealth building, worker ownership, and why the Lansing model works when top-down economic development doesn't.",
  },
  {
    num: "02",
    title: "The Sunshine House — community ownership of housing",
    guest: "Housing roundtable",
    topic: "How the Fledge Fractals model works, what it takes to launch a community housing project, and what the first deal looks like.",
  },
  {
    num: "03",
    title: "ALICE data and who gets left behind",
    guest: "Research roundtable",
    topic: "Asset Limited, Income Constrained, Employed — unpacking the data and building tools that actually reach people.",
  },
];

export default function PulsePage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3rem" }}>

      <div>
        <span className="eyebrow">Node 8 — Crash Out Pulse</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>
          Hear from people already building.
        </h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "600px", marginBottom: "1.5rem" }}>
          Crash Out Pulse is the audio layer of the platform — conversations with organizers, co-op founders, housing advocates, and ALICE households building real alternatives.
        </p>
        <div className="alert" style={{ background: "rgba(46,109,164,0.08)", border: "1px solid rgba(46,109,164,0.25)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
          <p style={{ fontWeight: 700, color: "var(--color-river-blue)", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
            In development
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            The podcast feed and episode player are coming soon. Episodes will be embedded here, searchable by topic and guest, with transcripts.
          </p>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>What to expect</h2>
        <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem", maxWidth: "600px" }}>
          Short episodes (15–30 min). Real conversations, not polished content. Every guest is doing the work, not talking about doing the work.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {SAMPLE_EPISODES.map(({ num, title, guest, topic }) => (
            <div key={num} className="card" style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--color-text-muted)", fontSize: "0.75rem", fontWeight: 700,
              }}>
                {num}
              </div>
              <div>
                <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.2rem" }}>{title}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--color-dome-gold)", marginBottom: "0.4rem" }}>{guest}</p>
                <p style={{ fontSize: "0.85rem" }}>{topic}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "12px", padding: "1.75rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Subscribe when it launches</h2>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
          Get notified when Crash Out Pulse goes live — or reach out if you want to be a guest.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="btn btn--primary">Create an account to be notified</Link>
          <a href="mailto:jerry@thefledge.com" className="btn btn--ghost">Be a guest</a>
        </div>
      </div>

      <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>&larr; Back to all nodes</Link>
      </div>
    </div>
  );
}

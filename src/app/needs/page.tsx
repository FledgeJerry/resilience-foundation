import Link from "next/link";

const RESOURCES = [
  {
    icon: "🥫",
    title: "Free Stands",
    desc: "The Fledge's network of free food and supply stands. Community-stocked, community-managed, no sign-up required.",
  },
  {
    icon: "🍱",
    title: "Food pantries & hot meals",
    desc: "Pantries, community fridges, hot meal sites, and SNAP enrollment help — mapped by neighborhood and hours.",
  },
  {
    icon: "🏥",
    title: "Healthcare",
    desc: "Community health centers, free clinics, dental access, behavioral health, and telehealth by zip code.",
  },
  {
    icon: "⚡",
    title: "Utility & housing crisis",
    desc: "Emergency rent/mortgage help, utility shutoff prevention, LIHEAP enrollment, and eviction legal aid.",
  },
  {
    icon: "👶",
    title: "Childcare",
    desc: "Subsidized childcare slots, Head Start enrollment, after-school programs, and childcare cooperative listings.",
  },
  {
    icon: "📶",
    title: "Internet & tech access",
    desc: "Low-cost broadband programs, device lending, and free public WiFi — searchable by neighborhood.",
  },
];

export default function NeedsPage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3rem" }}>

      <div>
        <span className="eyebrow">Node 3 — Basic Needs Map</span>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", marginBottom: "1rem" }}>
          Know what&apos;s available right now.
        </h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "600px", marginBottom: "1.5rem" }}>
          A live, searchable map of free and low-cost resources in your area — food, healthcare, childcare, housing help, and more. No barriers, no referrals required.
        </p>
        <div className="alert" style={{ background: "rgba(46,109,164,0.08)", border: "1px solid rgba(46,109,164,0.25)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
          <p style={{ fontWeight: 700, color: "var(--color-river-blue)", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
            In development
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            The Basic Needs Map is being built. When it launches, it will show real-time availability across the Lansing area, with a replication toolkit for other cities.
          </p>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>What&apos;s coming</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {RESOURCES.map(({ icon, title, desc }) => (
            <div key={title} className="card--raised">
              <p style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>{icon}</p>
              <p style={{ fontWeight: 700, color: "var(--color-limestone)", marginBottom: "0.4rem", fontSize: "0.95rem" }}>{title}</p>
              <p style={{ fontSize: "0.85rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "12px", padding: "1.75rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Do you run a resource in Lansing?</h2>
        <p style={{ fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
          If you operate a Free Stand, food pantry, clinic, or mutual aid network and want to be listed when this launches, get in touch.
        </p>
        <a href="mailto:jerry@thefledge.com" className="btn btn--primary">Contact us to be listed</a>
      </div>

      <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>&larr; Back to all nodes</Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function CoopPage() {
  const session = await auth();
  const handbookHref = session ? "/handbook" : "/register";
  const handbookLabel = session ? "My Handbook" : "Start Your Handbook";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "3rem 0 1rem" }}>
        <span className="eyebrow">Worker Co-op Builder</span>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", marginBottom: "1.25rem" }}>
          Build What We Need —<br />Together.
        </h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "560px", margin: "0 auto 2rem", color: "var(--color-text-secondary)" }}>
          A guided platform for founding groups ready to build a worker-owned cooperative — from first idea to full business plan.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={handbookHref} className="btn btn--primary">{handbookLabel}</Link>
          <Link href="/about" className="btn btn--secondary">Learn More</Link>
        </div>
        <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
          &ldquo;The most radical thing we can do is build something we actually own.&rdquo;
        </p>
      </section>

      <hr className="divider" />

      {/* Who this is for */}
      <section>
        <span className="eyebrow">Who This Is For</span>
        <h2 style={{ marginBottom: "1rem" }}>For people who are done waiting.</h2>
        <p style={{ marginBottom: "1rem" }}>
          You&apos;ve seen what happens when the people who do the work don&apos;t own the business. The hours get cut. The wages stay flat. The profits leave the neighborhood.
        </p>
        <p>
          A worker-owned cooperative is a direct answer to that — a business where the people who do the work own it, govern it democratically, and share in what it produces. Every worker has a voice. Every worker builds real wealth. And the value your business creates stays right here, in the community that built it.
        </p>
      </section>

      {/* Four Bottom Lines */}
      <section>
        <span className="eyebrow">How We Measure Success</span>
        <h2 style={{ marginBottom: "1.5rem" }}>The Four Bottom Lines</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            { label: "People", color: "var(--color-river-blue)", desc: "Every worker-owner treated with dignity. Fair wages. Safe, inclusive workplaces." },
            { label: "Planet", color: "var(--color-teal-accent)", desc: "Responsible stewardship of the natural world. Know your supply chain." },
            { label: "Profit", color: "var(--color-dome-gold)", desc: "Financial sustainability that keeps the mission alive and builds member wealth." },
            { label: "Ownership", color: "var(--color-limestone)", desc: "Genuine democratic governance. One worker, one vote. Power stays distributed." },
          ].map(({ label, color, desc }) => (
            <div key={label} className="card--accent" style={{ borderLeftColor: color }}>
              <p style={{ fontWeight: 700, color, marginBottom: "0.4rem" }}>{label}</p>
              <p style={{ fontSize: "0.875rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PDCA */}
      <section>
        <span className="eyebrow">How It Works</span>
        <h2 style={{ marginBottom: "1rem" }}>The PDCA Cycle</h2>
        <p style={{ marginBottom: "1.5rem" }}>Everything in this handbook runs on one simple loop borrowed from science:</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          {[
            { step: "Plan", desc: "Understand the problem. Develop your idea as a group. Build a shared hypothesis." },
            { step: "Do", desc: "Test it together. Get it in front of real people. Start before it's perfect." },
            { step: "Check", desc: "Look at what's actually happening. Collect real feedback and real data." },
            { step: "Act", desc: "Change what isn't working. Double down on what is. Then start the loop again." },
          ].map(({ step, desc }) => (
            <div key={step} className="card">
              <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", color: "var(--color-dome-gold)", marginBottom: "0.5rem" }}>{step}</p>
              <p style={{ fontSize: "0.875rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ethical Floor */}
      <section>
        <span className="eyebrow">Our Shared Values</span>
        <h2 style={{ marginBottom: "1rem" }}>The Ethical Floor</h2>
        <p style={{ marginBottom: "1.5rem" }}>These aren&apos;t rules handed down from above — they&apos;re the commitments your founding group makes to each other, your workers, and your community from day one.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { title: "Living Wages", desc: "Every worker-owner earns enough to live with dignity. The minimum wage is not the living wage." },
            { title: "No Exploitation", desc: "Your fellow worker-owners, customers, and community deserve to be treated as whole human beings." },
            { title: "Democratic Governance", desc: "One worker, one vote. Not one dollar, one vote." },
            { title: "Transparency", desc: "Open books. Honest numbers. Real conversations. Secrets are how power concentrates." },
            { title: "Community Benefit", desc: "Local suppliers. Local jobs. Local investment. Keep the value in the neighborhood." },
            { title: "Co-ops Buy From Co-ops", desc: "When we choose our suppliers, vendors, and service providers, we look inside the network first. Keeping value circulating within the co-op ecosystem is how we grow together." },
          ].map(({ title, desc }) => (
            <div key={title} className="card--raised" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <strong style={{ whiteSpace: "nowrap", minWidth: "160px" }}>{title}</strong>
              <p style={{ fontSize: "0.9rem", margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "2rem 0 3rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Ready to build?</h2>
        <p style={{ marginBottom: "2rem", maxWidth: "480px", margin: "0 auto 2rem" }}>
          Create a free account to start your co-op handbook. Save your answers, collaborate with your founding group, and generate your full business plan.
        </p>
        <Link href={handbookHref} className="btn btn--primary">{handbookLabel}</Link>
      </section>

    </div>
  );
}

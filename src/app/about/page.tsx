import Link from "next/link";

export default function AboutPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem", maxWidth: "700px" }}>

      <section>
        <span className="eyebrow">What This Is</span>
        <h1 style={{ marginBottom: "1rem" }}>Eight tools. One goal: build what takes care of us.</h1>
        <p style={{ fontSize: "1.1rem", marginBottom: "1rem", lineHeight: 1.7 }}>
          Crash Out is a platform for ALICE households and community organizers who are done waiting for someone else to fix things.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          ALICE stands for Asset Limited, Income Constrained, Employed. These are people doing everything right and still falling behind — working full time, paying rent, keeping the lights on — and finding that the system is designed to keep them there. Crash Out is built specifically for them.
        </p>
        <p>
          Not a program. Not a grant. A set of working tools organized around eight interconnected paths to ownership, stability, and shared power.
        </p>
      </section>

      <section>
        <span className="eyebrow">The Eight Nodes</span>
        <h2 style={{ marginBottom: "1rem" }}>Every path in one place</h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Each node is a self-contained module — a real working tool, not an explainer. Three are live now. The rest are in active development.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            {
              name: "Worker Co-op Builder",
              href: "/co-op",
              live: true,
              desc: "A 13-section handbook that takes a founding group from idea to business plan. Legal templates, governance structures, democratic bylaws.",
            },
            {
              name: "Fledge Fractals",
              href: "/housing",
              live: true,
              desc: "Community-owned housing where your rent builds real equity shares — the same equity you'd earn paying a 30-year mortgage. Renter-centric from the ground up.",
            },
            {
              name: "Entrepreneurial Journey",
              href: "/journey",
              live: true,
              desc: "Eight stages from idea to co-op, with a traditional path fork at Stage 4. Track your business, manage contacts and deals, and see your financials in one place.",
            },
            {
              name: "Basic Needs Map",
              href: null,
              live: false,
              desc: "Free Stands, food pantries, healthcare, and live community resources. Know what's available right now.",
            },
            {
              name: "Replicate It",
              href: null,
              live: false,
              desc: "Open-source playbook for building Crash Out in your city. Everything we've built — yours to use.",
            },
            {
              name: "Research + Benchmarks",
              href: null,
              live: false,
              desc: "ALICE data, co-op outcomes, and living wage index. Know your ground before you build.",
            },
            {
              name: "Governance Library",
              href: null,
              live: false,
              desc: "Bylaws, ICA principles, voting models, and AI governance. Govern democratically from day one.",
            },
            {
              name: "Crash Out Pulse",
              href: null,
              live: false,
              desc: "Daily podcast feed and episodes. Hear from people already building.",
            },
          ].map(({ name, href, live, desc }) => (
            <div
              key={name}
              style={{
                display: "flex",
                gap: "1rem",
                padding: "1rem 1.25rem",
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                opacity: live ? 1 : 0.65,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                  {href ? (
                    <Link href={href} style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-limestone)", textDecoration: "none" }}>
                      {name}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-limestone)" }}>{name}</span>
                  )}
                  <span className={live ? "badge badge--teal" : "badge badge--muted"} style={{ fontSize: "0.65rem" }}>
                    {live ? "Live" : "Coming soon"}
                  </span>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <span className="eyebrow">What Makes This Different</span>
        <h2 style={{ marginBottom: "1rem" }}>The value stays here</h2>
        <p style={{ marginBottom: "1rem" }}>
          Most platforms extract value from the people who use them. This one is designed to do the opposite.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          Co-ops built with this platform buy from other co-ops. Housing projects built on the Fledge Fractals model keep equity in the hands of the people who actually live there. Every tool on this platform is designed so that what gets built — stays built, and stays in the community.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          Democratic governance is built in, not bolted on. Workers and shareholders can propose changes, vote on decisions, and close proposals with a recorded tally — whether the vote happens online or at a meeting table.
        </p>
        <p>
          That&apos;s not an ideological position. It&apos;s better math. Businesses that pay living wages and govern democratically produce more durable value than ones that don&apos;t. The co-op model isn&apos;t charity. It&apos;s a better way to run a business.
        </p>
      </section>

      <section>
        <span className="eyebrow">Built to Spread</span>
        <h2 style={{ marginBottom: "1rem" }}>Lansing first. Then everywhere.</h2>
        <p style={{ marginBottom: "1rem" }}>
          Lansing, Michigan is our home base and our proving ground. The Fledge has been supporting entrepreneurs, artists, and community builders at 1300 Eureka Street since 2013. Crash Out is the next chapter — building the infrastructure for a worker-owned economy, starting here.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          But every tool on this platform is designed to work anywhere. The co-op handbook works in any state. The Entrepreneurial Journey works for any type of business in any city. The Fledge Fractals housing model is built to replicate. When the Replicate It node launches, it will include everything you need to build Crash Out in your own city — the playbook, the legal templates, the infrastructure.
        </p>
        <p>
          The Fledge is the first node in a network. The goal is to make that network unnecessary to belong to — to give every community the tools to build its own version.
        </p>
      </section>

      <section>
        <span className="eyebrow">Infrastructure That Means It</span>
        <h2 style={{ marginBottom: "1rem" }}>This platform runs on a computer in our building</h2>
        <p style={{ marginBottom: "1rem" }}>
          resilience.foundation doesn&apos;t run on a server farm owned by Amazon or Google. It runs on a Raspberry Pi sitting inside The Fledge at 1300 Eureka Street in Lansing, MI. Your data stays in our building, on hardware we own.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          That&apos;s not a quirk. It&apos;s a statement. If we&apos;re going to ask you to build something you actually own, we should practice what we preach.
        </p>
        <div className="card--accent">
          <p style={{ margin: 0, fontStyle: "italic", color: "var(--color-limestone)" }}>
            &ldquo;The most radical thing we can do is build something we actually own.&rdquo;
          </p>
        </div>
      </section>

    </div>
  );
}

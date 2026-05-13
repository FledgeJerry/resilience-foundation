import Link from "next/link";
import { auth } from "@/lib/auth";

const STAGES = [
  {
    num: 1,
    key: "IDEA",
    label: "Idea",
    tagline: "Capture the spark",
    desc: "You've got something in your head. Write it down. Who hurts from a problem you understand better than anyone else? That's where businesses are born.",
    tools: ["Problem statement worksheet", "Market research primer"],
    fork: false,
  },
  {
    num: 2,
    key: "KNOW_GROUND",
    label: "Know Your Ground",
    tagline: "Understand your terrain",
    desc: "Before you build, understand the ground you're standing on. Who's already doing this? Who's your customer, really? What does the community actually need?",
    tools: ["Competitive landscape canvas", "Customer persona builder", "ALICE data explorer"],
    fork: false,
  },
  {
    num: 3,
    key: "FIND_PEOPLE",
    label: "Find Your People",
    tagline: "You can't do this alone",
    desc: "Every business is built by people, not just the founder. Find your core team, your advisors, your first potential customers. Start your contact list here — it follows you the whole way.",
    tools: ["Contact manager (unlocks here)", "Team gap analysis", "Advisor outreach templates"],
    fork: false,
    unlocks: "Contacts",
  },
  {
    num: 4,
    key: "BUILD_STRUCTURE",
    label: "Build Structure",
    tagline: "How will you be organized?",
    desc: "This is where the road forks. Both paths are legitimate — the right one depends on your goals, your team, and your community. You can always talk it through with a Fledge coach.",
    tools: [],
    fork: true,
  },
  {
    num: 5,
    key: "TEST_SMALL",
    label: "Test Small",
    tagline: "Get something in front of real people",
    desc: "No business plan survives first contact with a customer. Build the smallest version you can, get it in front of real people, and learn fast. Track your first deals here.",
    tools: ["Deal pipeline (unlocks here)", "MVP planning canvas", "Feedback loop tracker"],
    fork: false,
    unlocks: "Deals",
  },
  {
    num: 6,
    key: "GET_SUPPORT",
    label: "Get Support",
    tagline: "You don't have to figure this out alone",
    desc: "Grants, loans, crowdfunding, coaching — there's more available than most people know. The Fledge works with entrepreneurs on both paths.",
    tools: ["Fledge coaching inquiry", "Funding source finder", "Grant writing guide"],
    fork: false,
  },
  {
    num: 7,
    key: "SUSTAIN",
    label: "Sustain It",
    tagline: "Build a real operation",
    desc: "You've got customers. Now build the systems to serve them reliably — finances, operations, team. Your full P&L lives here.",
    tools: ["Financial ledger (unlocks here)", "Operations checklist", "Team agreements"],
    fork: false,
    unlocks: "Financials",
  },
  {
    num: 8,
    key: "GROW",
    label: "Grow the Ecosystem",
    tagline: "Lift others as you rise",
    desc: "You made it. Now share what you learned. Mentor someone else. Consider whether a co-op conversion makes sense. Plug into the broader Crash Out movement.",
    tools: ["Replication toolkit", "Mentorship matching", "Co-op conversion guide"],
    fork: false,
  },
];

export default async function JourneyPage() {
  const session = await auth();

  return (
    <main className="journey-public">
      {/* Hero */}
      <section className="journey-hero">
        <div className="container">
          <p className="journey-hero__eyebrow">Entrepreneurial Journey</p>
          <h1 className="journey-hero__headline">From idea to operation.</h1>
          <p className="journey-hero__sub">
            Eight stages, two paths, one goal: a business that actually works for you and your
            community. This isn&apos;t a checklist. It&apos;s a working toolkit you build as you go.
          </p>
          {session ? (
            <Link href="/journey/businesses" className="btn btn--primary btn--lg">
              My Businesses
            </Link>
          ) : (
            <div className="journey-hero__cta-row">
              <Link href="/register" className="btn btn--primary btn--lg">
                Start your journey
              </Link>
              <Link href="/login" className="btn btn--outline btn--lg">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Road */}
      <section className="journey-road">
        <div className="container">
          <div className="journey-road__stages">
            {STAGES.map((stage, i) => (
              <div key={stage.key} className={`journey-stage${stage.fork ? " journey-stage--fork" : ""}`}>
                {/* Connector line above (not first) */}
                {i > 0 && <div className="journey-stage__connector" />}

                <div className="journey-stage__card">
                  <div className="journey-stage__num">{stage.num}</div>
                  <div className="journey-stage__body">
                    <div className="journey-stage__label">{stage.label}</div>
                    <div className="journey-stage__tagline">{stage.tagline}</div>
                    <p className="journey-stage__desc">{stage.desc}</p>

                    {stage.unlocks && (
                      <div className="journey-stage__unlock">
                        Unlocks: <strong>{stage.unlocks}</strong>
                      </div>
                    )}

                    {stage.tools.length > 0 && (
                      <ul className="journey-stage__tools">
                        {stage.tools.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Fork callout */}
                {stage.fork && (
                  <div className="journey-fork">
                    <div className="journey-fork__label">The road forks here</div>
                    <div className="journey-fork__paths">
                      <div className="journey-fork__path journey-fork__path--traditional">
                        <div className="journey-fork__path-label">Traditional</div>
                        <p>LLC, S-Corp, or C-Corp. Equity ownership. Investor-ready decks. You own it, you control it, you keep the upside.</p>
                        <ul>
                          <li>Entity formation guide</li>
                          <li>Cap table template</li>
                          <li>Investor pitch framework</li>
                        </ul>
                      </div>
                      <div className="journey-fork__path journey-fork__path--coop">
                        <div className="journey-fork__path-label">Worker Co-op</div>
                        <p>Democratic ownership. Every worker has a voice. Profits shared by those who do the work — not just the people who funded it.</p>
                        <ul>
                          <li>Co-op handbook builder</li>
                          <li>Bylaws generator</li>
                          <li>ICA principles guide</li>
                        </ul>
                      </div>
                    </div>
                    <div className="journey-fork__note">
                      Not sure? Talk to a Fledge coach — it&apos;s free, and they&apos;ve seen both paths.{" "}
                      <Link href="/about">Learn about The Fledge</Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="journey-cta">
        <div className="container">
          <h2>Ready to start?</h2>
          <p>
            Create a business, pick your current stage, and the right tools appear as you need them.
            Nothing locked behind paywalls. Built in Lansing, open to everywhere.
          </p>
          {session ? (
            <Link href="/journey/businesses" className="btn btn--primary btn--lg">
              Go to my businesses
            </Link>
          ) : (
            <Link href="/register" className="btn btn--primary btn--lg">
              Create a free account
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

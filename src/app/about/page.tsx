export default function AboutPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem", maxWidth: "700px" }}>

      <section>
        <span className="eyebrow">Our Mission</span>
        <h1 style={{ marginBottom: "1rem" }}>Make Lansing the Worker-Owned Co-op Capital of the U.S.</h1>
        <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
          That&apos;s not a slogan. It&apos;s a plan.
        </p>
        <p>
          Lansing, Michigan is our home base and our proving ground. We believe a city can make a conscious choice to build its economy differently — where the people doing the work own the business, share in what it produces, and have a real vote in how it&apos;s run. We&apos;re here to make that choice easier.
        </p>
      </section>

      <section>
        <span className="eyebrow">But You Don&apos;t Have to Be From Lansing</span>
        <h2 style={{ marginBottom: "1rem" }}>This Tool Is for Anyone Ready to Build</h2>
        <p style={{ marginBottom: "1rem" }}>
          We built resilience.foundation to be useful anywhere a group of workers is tired of waiting for someone else to fix things. Whether you&apos;re in Lansing or Los Angeles, Detroit or Denver — if you want to build something your community actually owns, this handbook is for you.
        </p>
        <p>
          We just happen to be doing it loudest in Michigan.
        </p>
      </section>

      <section>
        <span className="eyebrow">Why We&apos;re Doing This</span>
        <h2 style={{ marginBottom: "1rem" }}>We Need to Take Back Our Shit</h2>
        <p style={{ marginBottom: "1rem" }}>
          The current system is very good at one thing: concentrating wealth in the hands of people who already have it. It rewards hoarding. It extracts value from workers and neighborhoods and ships it somewhere else. And it calls that progress.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          We don&apos;t accept that. Not because it&apos;s idealistic — but because it&apos;s just bad math. A local business that pays living wages, governs itself democratically, and reinvests its surplus in the community creates more durable value than one that doesn&apos;t. The co-op model isn&apos;t charity. It&apos;s a better way to run a business.
        </p>
        <p>
          resilience.foundation exists to make that model accessible — not just to people with MBAs and startup capital, but to workers who have been told the economic system isn&apos;t for them. It is. You just have to build it yourself.
        </p>
      </section>

      <section>
        <span className="eyebrow">Rooted in Lansing</span>
        <h2 style={{ marginBottom: "1rem" }}>A Project of The Fledge</h2>
        <p style={{ marginBottom: "1rem" }}>
          resilience.foundation is built and maintained by <a href="https://thefledge.com" target="_blank" rel="noopener noreferrer">The Fledge</a> — a social enterprise and community space at 1300 Eureka Street in Lansing, MI. The Fledge has been supporting entrepreneurs, artists, and community builders since 2013. Worker ownership is the next chapter.
        </p>
        <div className="card--accent" style={{ marginTop: "1.5rem" }}>
          <p style={{ margin: 0, fontStyle: "italic", color: "var(--color-limestone)" }}>
            "The most radical thing we can do is build something we actually own."
          </p>
        </div>
      </section>

      <section>
        <span className="eyebrow">Infrastructure That Means It</span>
        <h2 style={{ marginBottom: "1rem" }}>This Platform Runs on a Computer in Our Building</h2>
        <p style={{ marginBottom: "1rem" }}>
          resilience.foundation doesn&apos;t run on a server farm owned by Amazon or Google. It runs on a Raspberry Pi sitting inside The Fledge at 1300 Eureka Street in Lansing, MI. Your data stays in our building, on hardware we own.
        </p>
        <p>
          That&apos;s not a quirk. It&apos;s a statement. If we&apos;re going to ask you to build something you actually own, we should practice what we preach.
        </p>
      </section>

    </div>
  );
}

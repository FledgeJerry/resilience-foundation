import type { Metadata } from "next";
import { IBM_Plex_Sans, Merriweather } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import SessionProvider from "@/components/SessionProvider";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const merriweather = Merriweather({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: { default: "resilience.foundation — Build What You Own", template: "%s | resilience.foundation" },
  description: "A guided platform for founding worker-owned cooperatives and building community resilience in Lansing, Michigan and beyond. Co-op handbook wizard, housing roadmap, entrepreneurial journey, governance library.",
  keywords: ["worker cooperative", "co-op handbook", "worker ownership", "Lansing cooperative", "build a co-op", "community resilience", "cooperative economy", "housing roadmap", "entrepreneurial journey"],
  metadataBase: new URL("https://resilience.foundation"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "resilience.foundation",
    title: "resilience.foundation — Build What You Own",
    description: "A guided platform for founding worker-owned cooperatives and building community resilience. Co-op handbook, housing, entrepreneurial journey, and more.",
    url: "https://resilience.foundation",
  },
  twitter: {
    card: "summary_large_image",
    title: "resilience.foundation — Build What You Own",
    description: "A guided platform for founding worker-owned cooperatives and building community resilience.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${merriweather.variable}`}>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "resilience.foundation",
            url: "https://resilience.foundation",
            description: "A guided platform for founding worker-owned cooperatives and building community resilience.",
            parentOrganization: {
              "@type": "Organization",
              name: "The Fledge",
              url: "https://thefledge.com",
            },
            address: { "@type": "PostalAddress", streetAddress: "1300 Eureka St", addressLocality: "Lansing", addressRegion: "MI", postalCode: "48912", addressCountry: "US" },
          }) }}
        />
        <SessionProvider>
          <Nav />
          <main style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "2rem 1.5rem" }}>
            {children}
          </main>
          <footer className="site-footer">
            <div style={{
              maxWidth: "1100px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "2rem",
              textAlign: "left",
              padding: "2rem 0 1.5rem",
            }}>
              {/* Left: branding */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--color-limestone)", fontSize: "1rem", margin: 0 }}>
                  Crash Out<span style={{ color: "var(--color-dome-gold)" }}>:</span> A Resiliency Hub
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>
                  A project of{" "}
                  <a href="https://thefledge.com" target="_blank" rel="noopener noreferrer">The Fledge</a>
                  <br />1300 Eureka Street, Lansing, MI
                </p>
              </div>

              {/* Center: nodes + pages */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                  The Eight Nodes
                </p>
                {[
                  { label: "Worker Co-op Builder", href: "/co-op" },
                  { label: "Housing Roadmap", href: "/housing" },
                  { label: "Basic Needs Map", href: "/needs" },
                  { label: "Entrepreneurial Journey", href: "/journey" },
                  { label: "Replicate It", href: "/replicate" },
                  { label: "Research + Benchmarks", href: "/research" },
                  { label: "Governance Library", href: "/governance" },
                  { label: "Crash Out Pulse", href: "/pulse" },
                ].map(({ label, href }) => (
                  <a key={href} href={href} style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block" }}>{label}</a>
                ))}
              </div>

              {/* Right: about + open source */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                  Platform
                </p>
                {[
                  { label: "About", href: "/about" },
                  { label: "Directory", href: "/directory" },
                  { label: "Open Source", href: "https://github.com/FledgeJerry" },
                ].map(({ label, href }) => (
                  <a key={href} href={href} style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block" }}>{label}</a>
                ))}
                <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                  Built in Lansing.<br />Open to everywhere.
                </p>
                <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                  CC BY-SA — share and adapt freely.
                </p>
              </div>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { RegionPulseData } from "@/app/api/regionpulse/[zip]/route";

type BusinessType = "UNDECIDED" | "TRADITIONAL" | "COOP";

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}
function fmtNum(n: number) {
  return n.toLocaleString("en-US");
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rp-stat">
      <span className="rp-stat__label">{label}</span>
      <span className="rp-stat__value">{value}</span>
      {sub && <span className="rp-stat__sub">{sub}</span>}
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return <h3 className="rp-section-head">{title}</h3>;
}

export default function RegionPulsePanel({
  zip,
  bizType,
  onZipChange,
}: {
  zip: string | null;
  bizType: BusinessType;
  onZipChange?: (zip: string) => void;
}) {
  const [data, setData] = useState<RegionPulseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipInput, setZipInput] = useState(zip ?? "");

  useEffect(() => {
    if (!zip || !/^\d{5}$/.test(zip)) return;
    setLoading(true);
    setError(null);
    fetch(`/api/regionpulse/${zip}`)
      .then((r) => {
        if (!r.ok) throw new Error("No data found for that ZIP code.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [zip]);

  function submitZip(e: React.FormEvent) {
    e.preventDefault();
    if (/^\d{5}$/.test(zipInput)) onZipChange?.(zipInput);
  }

  if (!zip || !/^\d{5}$/.test(zip)) {
    return (
      <div className="rp-panel rp-panel--empty">
        <p className="rp-panel__hint">
          Enter a ZIP code to see market intelligence for your area — population, income, employment,
          housing costs, and education levels pulled from U.S. Census data.
        </p>
        {onZipChange && (
          <form className="rp-zip-form" onSubmit={submitZip}>
            <input
              className="rp-zip-input"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="ZIP code"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ""))}
            />
            <button className="btn btn--primary btn--sm" type="submit" disabled={zipInput.length !== 5}>
              Load market data
            </button>
          </form>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="rp-panel rp-panel--loading"><p className="loading-text">Loading Census data for {zip}…</p></div>;
  }

  if (error || !data) {
    return (
      <div className="rp-panel rp-panel--error">
        <p className="rp-panel__hint">{error ?? "No data returned."}</p>
        {onZipChange && (
          <form className="rp-zip-form" onSubmit={submitZip}>
            <input
              className="rp-zip-input"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="ZIP code"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ""))}
            />
            <button className="btn btn--primary btn--sm" type="submit" disabled={zipInput.length !== 5}>
              Try another ZIP
            </button>
          </form>
        )}
      </div>
    );
  }

  const laborParticipation = data.laborForce > 0 && data.population > 0
    ? Math.round((data.laborForce / data.population) * 100)
    : null;

  return (
    <div className="rp-panel">
      <div className="rp-header">
        <div>
          <h2 className="rp-title">
            {data.name === data.zip ? `ZIP Code ${data.zip}` : data.name}
          </h2>
          <p className="rp-zip-label">ZIP {data.zip} · U.S. Census ACS data</p>
        </div>
        {onZipChange && (
          <form className="rp-zip-form rp-zip-form--inline" onSubmit={submitZip}>
            <input
              className="rp-zip-input"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="Change ZIP"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ""))}
            />
            <button className="btn btn--ghost btn--sm" type="submit" disabled={zipInput.length !== 5}>
              Update
            </button>
          </form>
        )}
      </div>

      {/* People */}
      <SectionHead title="People" />
      <div className="rp-stats-grid">
        <StatCard label="Population" value={fmtNum(data.population)} />
        <StatCard label="Labor force" value={fmtNum(data.laborForce)}
          sub={laborParticipation != null ? `${laborParticipation}% of population` : undefined} />
        <StatCard label="Employed" value={fmtNum(data.employed)} />
        <StatCard
          label="Unemployment rate"
          value={fmtPct(data.unemploymentRate)}
          sub={`${fmtNum(data.unemployed)} residents`}
        />
      </div>

      {bizType === "COOP" && data.unemploymentRate > 7 && (
        <p className="rp-insight rp-insight--coop">
          With {fmtPct(data.unemploymentRate)} unemployment, there&apos;s a real pool of workers who could
          benefit from co-op membership — stable jobs owned by the people doing the work.
        </p>
      )}
      {bizType !== "COOP" && data.laborForce > 5000 && (
        <p className="rp-insight">
          A labor force of {fmtNum(data.laborForce)} means a sizable local workforce to hire from
          and a built-in customer base for consumer-facing businesses.
        </p>
      )}

      {/* Economics */}
      <SectionHead title="Economics" />
      <div className="rp-stats-grid">
        <StatCard label="Median household income" value={fmt$(data.medianIncome)} />
        <StatCard label="Median home value" value={fmt$(data.medianHomeValue)} />
      </div>

      {data.medianIncome < 45000 && (
        <p className="rp-insight rp-insight--alert">
          Median income of {fmt$(data.medianIncome)} puts many residents in ALICE territory
          (Asset Limited, Income Constrained, Employed). Pricing and accessibility matter here.
        </p>
      )}
      {data.medianIncome >= 45000 && data.medianIncome < 75000 && (
        <p className="rp-insight">
          Median income of {fmt$(data.medianIncome)} is middle-ground — enough purchasing power for
          everyday goods and services, but cost sensitivity remains real.
        </p>
      )}
      {bizType === "COOP" && (
        <p className="rp-insight rp-insight--coop">
          A co-op can keep wealth local: member profits stay in the community rather than flowing
          to outside investors. At median income {fmt$(data.medianIncome)}, that matters.
        </p>
      )}

      {/* Education */}
      <SectionHead title="Education" />
      <div className="rp-stats-grid">
        <StatCard
          label="Bachelor's degree or higher"
          value={fmtPct(data.pctBachelorsPlus)}
          sub="of adults 25+"
        />
      </div>

      {data.pctBachelorsPlus < 20 && (
        <p className="rp-insight rp-insight--alert">
          Fewer than 1 in 5 adults holds a 4-year degree. If your business requires skilled
          workers, plan for on-the-job training. If you&apos;re serving this community, keep
          communication plain and accessible.
        </p>
      )}
      {data.pctBachelorsPlus >= 20 && data.pctBachelorsPlus < 40 && (
        <p className="rp-insight">
          About {fmtPct(data.pctBachelorsPlus)} of adults have a bachelor&apos;s degree — a mixed
          market. Think about which segment of this community you&apos;re primarily serving.
        </p>
      )}
      {data.pctBachelorsPlus >= 40 && (
        <p className="rp-insight">
          High education rate ({fmtPct(data.pctBachelorsPlus)}) often correlates with higher
          spending power and appetite for complex products and services.
        </p>
      )}

      {/* Community */}
      <SectionHead title="Community" />
      <div className="rp-stats-grid">
        <StatCard label="Minority residents" value={fmtPct(data.pctMinority)} />
        <StatCard label="White residents" value={fmtPct(data.pctWhite)} />
      </div>

      {bizType === "COOP" && data.pctMinority > 40 && (
        <p className="rp-insight rp-insight--coop">
          With {fmtPct(data.pctMinority)} minority residents, a worker co-op here has real
          potential to build generational wealth in communities historically excluded from
          business ownership.
        </p>
      )}

      <p className="rp-source">
        Source: Census Reporter / U.S. Census ACS · Last fetched{" "}
        {new Date(data.fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { downloadMarkdown, printDate } from "@/lib/download";
import { jsonToMarkdown } from "@/lib/doc-markdown";

type DocConfig = {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  render: (doc: Record<string, unknown>) => React.ReactNode;
};

function fmt$(n: number) {
  return n?.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) ?? "—";
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="doc-section">
      <h4 className="doc-section__title">{title}</h4>
      <div className="doc-section__body">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="doc-empty">—</p>;
  return <ul className="doc-bullets">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}

function renderExecSummary(doc: Record<string, unknown>) {
  return (
    <>
      <div className="doc-hero">
        <h3 className="doc-hero__name">{doc.businessName as string}</h3>
        <p className="doc-hero__tagline">{doc.tagline as string}</p>
      </div>
      {[
        ["Overview", doc.overview], ["Problem", doc.problem], ["Solution", doc.solution],
        ["Market Opportunity", doc.market], ["Team & Ownership", doc.team],
        ["Financials", doc.financials], ["Community Impact", doc.impact], ["Vision", doc.vision],
      ].map(([label, text]) => (
        <SectionBlock key={label as string} title={label as string}>
          <p>{text as string}</p>
        </SectionBlock>
      ))}
    </>
  );
}

function renderPitch(doc: Record<string, unknown>) {
  return (
    <>
      {[
        ["Hook", doc.hook], ["The Problem", doc.problem], ["Our Solution", doc.solution],
        ["Why Us", doc.whyUs], ["Early Traction", doc.traction], ["Our Ask", doc.ask], ["Vision", doc.vision],
      ].map(([label, text]) => (
        <SectionBlock key={label as string} title={label as string}>
          <p>{text as string}</p>
        </SectionBlock>
      ))}
      <SectionBlock title="90-Second Script">
        <pre className="doc-script">{doc.ninetySecondScript as string}</pre>
      </SectionBlock>
    </>
  );
}

function renderCanvas(doc: Record<string, unknown>) {
  const blocks = [
    ["Key Partners", "keyPartners"], ["Key Activities", "keyActivities"], ["Key Resources", "keyResources"],
    ["Value Propositions", "valuePropositions"], ["Customer Relationships", "customerRelationships"],
    ["Channels", "channels"], ["Customer Segments", "customerSegments"],
    ["Cost Structure", "costStructure"], ["Revenue Streams", "revenueStreams"],
  ];
  return (
    <div className="bmc-grid">
      {blocks.map(([label, key]) => (
        <div key={key} className={`bmc-block bmc-block--${key}`}>
          <p className="bmc-block__title">{label}</p>
          <p className="bmc-block__content" style={{ whiteSpace: "pre-line" }}>{doc[key] as string}</p>
        </div>
      ))}
    </div>
  );
}

function renderBudget(doc: Record<string, unknown>) {
  type LineItem = { category: string; item: string; amount: number; notes?: string; monthlyAmount?: number };
  type FundSource = { source: string; amount: number; type: string };
  const startupCosts = doc.startupCosts as LineItem[];
  const monthlyOps = doc.monthlyOperatingCosts as LineItem[];
  const funding = doc.fundingSources as FundSource[];
  return (
    <>
      <SectionBlock title="Startup Costs">
        <table className="doc-table">
          <thead><tr><th>Category</th><th>Item</th><th>Amount</th></tr></thead>
          <tbody>
            {startupCosts?.map((row, i) => (
              <tr key={i}><td>{row.category}</td><td>{row.item}</td><td>{fmt$(row.amount)}</td></tr>
            ))}
            <tr className="doc-table__total"><td colSpan={2}>Total Startup Costs</td><td>{fmt$(doc.totalStartupCost as number)}</td></tr>
          </tbody>
        </table>
      </SectionBlock>
      <SectionBlock title="Monthly Operating Costs">
        <table className="doc-table">
          <thead><tr><th>Category</th><th>Item</th><th>/Month</th></tr></thead>
          <tbody>
            {monthlyOps?.map((row, i) => (
              <tr key={i}><td>{row.category}</td><td>{row.item}</td><td>{fmt$(row.monthlyAmount ?? 0)}</td></tr>
            ))}
            <tr className="doc-table__total"><td colSpan={2}>Total Monthly Burn</td><td>{fmt$(doc.totalMonthlyBurn as number)}</td></tr>
          </tbody>
        </table>
      </SectionBlock>
      <SectionBlock title="Funding Sources">
        <table className="doc-table">
          <thead><tr><th>Source</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>
            {funding?.map((row, i) => (
              <tr key={i}><td>{row.source}</td><td>{row.type}</td><td>{fmt$(row.amount)}</td></tr>
            ))}
            <tr className="doc-table__total"><td colSpan={2}>Total Funding</td><td>{fmt$(doc.totalFunding as number)}</td></tr>
          </tbody>
        </table>
        {(doc.fundingGap as number) > 0 && (
          <p className="doc-gap-alert">Funding gap: {fmt$(doc.fundingGap as number)}</p>
        )}
      </SectionBlock>
      <SectionBlock title="Notes"><p>{doc.notes as string}</p></SectionBlock>
    </>
  );
}

function renderProforma(doc: Record<string, unknown>) {
  type YearData = { revenue: number; cogs: number; grossProfit: number; operatingExpenses: number; netIncome: number; monthlyBreakEven?: string };
  const rows: [string, YearData][] = [["Year 1", doc.year1 as YearData], ["Year 2", doc.year2 as YearData], ["Year 3", doc.year3 as YearData]];
  return (
    <>
      <SectionBlock title="3-Year Projections">
        <table className="doc-table">
          <thead><tr><th></th><th>Year 1</th><th>Year 2</th><th>Year 3</th></tr></thead>
          <tbody>
            {(["Revenue","COGS","Gross Profit","Operating Expenses","Net Income"] as const).map((label) => {
              const key = label.toLowerCase().replace(/ /g, "") as keyof YearData;
              return (
                <tr key={label} className={label === "Net Income" ? "doc-table__total" : ""}>
                  <td>{label}</td>
                  {rows.map(([yr, data]) => (
                    <td key={yr} className={(data[key] as number) < 0 ? "amount-expense" : ""}>{fmt$(data[key] as number)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {(doc.year1 as YearData).monthlyBreakEven && (
          <p className="doc-break-even">Break-even: {(doc.year1 as YearData).monthlyBreakEven}</p>
        )}
      </SectionBlock>
      <SectionBlock title="Key Assumptions"><BulletList items={doc.assumptions as string[]} /></SectionBlock>
      <SectionBlock title="Surplus Distribution"><p>{doc.surplusDistribution as string}</p></SectionBlock>
      <SectionBlock title="Financial Risks"><BulletList items={doc.risks as string[]} /></SectionBlock>
      <SectionBlock title="Notes"><p>{doc.notes as string}</p></SectionBlock>
    </>
  );
}

function renderBalanceSheet(doc: Record<string, unknown>) {
  type LineItem = { item: string; amount: number };
  type Section = { currentAssets: LineItem[]; fixedAssets: LineItem[]; totalCurrentAssets: number; totalFixedAssets: number; totalAssets: number };
  type LiabSection = { currentLiabilities: LineItem[]; longTermLiabilities: LineItem[]; totalCurrentLiabilities: number; totalLongTermLiabilities: number; totalLiabilities: number };
  type EqSection = { items: LineItem[]; totalEquity: number };
  const assets = doc.assets as Section;
  const liabilities = doc.liabilities as LiabSection;
  const equity = doc.equity as EqSection;
  return (
    <>
      <p className="doc-as-of">{doc.asOf as string}</p>
      <div className="balance-sheet-grid">
        <div>
          <SectionBlock title="Assets">
            <p className="doc-sub-heading">Current Assets</p>
            {assets?.currentAssets?.map((r, i) => <div key={i} className="bs-row"><span>{r.item}</span><span>{fmt$(r.amount)}</span></div>)}
            <div className="bs-row bs-row--subtotal"><span>Total Current Assets</span><span>{fmt$(assets?.totalCurrentAssets)}</span></div>
            <p className="doc-sub-heading" style={{ marginTop: "0.75rem" }}>Fixed Assets</p>
            {assets?.fixedAssets?.map((r, i) => <div key={i} className="bs-row"><span>{r.item}</span><span>{fmt$(r.amount)}</span></div>)}
            <div className="bs-row bs-row--total"><span>Total Assets</span><span>{fmt$(assets?.totalAssets)}</span></div>
          </SectionBlock>
        </div>
        <div>
          <SectionBlock title="Liabilities">
            <p className="doc-sub-heading">Current</p>
            {liabilities?.currentLiabilities?.map((r, i) => <div key={i} className="bs-row"><span>{r.item}</span><span>{fmt$(r.amount)}</span></div>)}
            <p className="doc-sub-heading" style={{ marginTop: "0.75rem" }}>Long-Term</p>
            {liabilities?.longTermLiabilities?.map((r, i) => <div key={i} className="bs-row"><span>{r.item}</span><span>{fmt$(r.amount)}</span></div>)}
            <div className="bs-row bs-row--subtotal"><span>Total Liabilities</span><span>{fmt$(liabilities?.totalLiabilities)}</span></div>
          </SectionBlock>
          <SectionBlock title="Member Equity">
            {equity?.items?.map((r, i) => <div key={i} className="bs-row"><span>{r.item}</span><span>{fmt$(r.amount)}</span></div>)}
            <div className="bs-row bs-row--total"><span>Total Equity</span><span>{fmt$(equity?.totalEquity)}</span></div>
          </SectionBlock>
        </div>
      </div>
      <SectionBlock title="Notes"><p>{doc.notes as string}</p></SectionBlock>
    </>
  );
}

function renderScorecard(doc: Record<string, unknown>) {
  type BottomLine = { commitments: string[]; metrics: { metric: string; target: string; description: string }[]; grade: string };
  const lines: [string, BottomLine][] = [
    ["People", doc.people as BottomLine], ["Planet", doc.planet as BottomLine],
    ["Profit", doc.profit as BottomLine], ["Ownership", doc.ownership as BottomLine],
  ];
  const gradeColor: Record<string, string> = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#ef4444" };
  return (
    <>
      <SectionBlock title="Summary"><p>{doc.summary as string}</p></SectionBlock>
      <div className="scorecard-grid">
        {lines.map(([label, data]) => (
          <div key={label} className="scorecard-block">
            <div className="scorecard-block__header">
              <h4>{label}</h4>
              <span className="scorecard-grade" style={{ color: gradeColor[data?.grade] ?? "#888" }}>{data?.grade}</span>
            </div>
            <div className="scorecard-block__metrics">
              {data?.metrics?.map((m, i) => (
                <div key={i} className="scorecard-metric">
                  <span className="scorecard-metric__label">{m.metric}</span>
                  <span className="scorecard-metric__target">{m.target}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SectionBlock title="Strengths"><BulletList items={doc.strengths as string[]} /></SectionBlock>
      <SectionBlock title="Gaps to Address"><BulletList items={doc.gaps as string[]} /></SectionBlock>
    </>
  );
}

function renderEquitySchedule(doc: Record<string, unknown>) {
  type CapRow = { year: string; members: number; totalCapital: number; perMemberAccount: number; patronageDistributed: number };
  const schedule = doc.capitalAccountSchedule as CapRow[];
  return (
    <>
      <SectionBlock title="Ownership Model"><p>{doc.ownershipModel as string}</p></SectionBlock>
      <SectionBlock title="Capital Account Schedule">
        <table className="doc-table">
          <thead><tr><th>Year</th><th>Members</th><th>Total Capital</th><th>Per Member</th><th>Patronage Distributed</th></tr></thead>
          <tbody>
            {schedule?.map((row, i) => (
              <tr key={i}>
                <td>{row.year}</td><td>{row.members}</td>
                <td>{fmt$(row.totalCapital)}</td><td>{fmt$(row.perMemberAccount)}</td><td>{fmt$(row.patronageDistributed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionBlock>
      <SectionBlock title="Surplus Distribution">
        {Object.entries(doc.surplusDistribution as Record<string, string>).map(([k, v]) => (
          <div key={k} className="bs-row"><span style={{ textTransform: "capitalize" }}>{k}</span><span>{v}</span></div>
        ))}
      </SectionBlock>
      <SectionBlock title="Governance Rights"><BulletList items={doc.governanceRights as string[]} /></SectionBlock>
      <SectionBlock title="New Member Path"><p>{doc.newMemberPath as string}</p></SectionBlock>
      <SectionBlock title="Notes"><p>{doc.notes as string}</p></SectionBlock>
    </>
  );
}

function renderEcosystemMap(doc: Record<string, unknown>) {
  type ValueFlow = { from: string; to: string; what: string };
  return (
    <>
      <SectionBlock title="Center">{doc.center as string}</SectionBlock>
      <SectionBlock title="Customers">
        {(doc.customers as { name: string; type: string; relationship: string }[])?.map((c, i) => (
          <div key={i} className="eco-row"><strong>{c.name}</strong> — {c.type} — {c.relationship}</div>
        ))}
      </SectionBlock>
      <SectionBlock title="Suppliers">
        {(doc.suppliers as { name: string; what: string; relationship: string }[])?.map((s, i) => (
          <div key={i} className="eco-row"><strong>{s.name}</strong>: {s.what}</div>
        ))}
      </SectionBlock>
      <SectionBlock title="Partners">
        {(doc.partners as { name: string; type: string; relationship: string }[])?.map((p, i) => (
          <div key={i} className="eco-row"><strong>{p.name}</strong> ({p.type}) — {p.relationship}</div>
        ))}
      </SectionBlock>
      <SectionBlock title="Value Flows">
        {(doc.valueFlows as ValueFlow[])?.map((v, i) => (
          <div key={i} className="eco-flow">{v.from} → {v.to}: <em>{v.what}</em></div>
        ))}
      </SectionBlock>
      <SectionBlock title="Co-op Connections"><BulletList items={doc.coopConnections as string[]} /></SectionBlock>
      <SectionBlock title="Community Impact"><p>{doc.communityImpact as string}</p></SectionBlock>
      <SectionBlock title="Ecosystem Gaps"><BulletList items={doc.gaps as string[]} /></SectionBlock>
    </>
  );
}

const DOCS: DocConfig[] = [
  { id: "executive-summary", title: "Executive Summary", description: "2-page overview for grants and partnerships.", endpoint: "executive-summary", render: (d) => renderExecSummary(d) },
  { id: "pitch", title: "Pitch", description: "90-second community pitch + structured pitch deck content.", endpoint: "pitch", render: (d) => renderPitch(d) },
  { id: "canvas", title: "Business Model Canvas", description: "9-box BMC — the full value creation picture.", endpoint: "canvas", render: (d) => renderCanvas(d) },
  { id: "budget", title: "Startup Budget", description: "Itemized startup costs, monthly burn, and funding sources.", endpoint: "budget", render: (d) => renderBudget(d) },
  { id: "proforma", title: "Financial Pro Forma", description: "3-year revenue and expense projections.", endpoint: "proforma", render: (d) => renderProforma(d) },
  { id: "balance-sheet", title: "Balance Sheet", description: "Projected opening day assets, liabilities, and equity.", endpoint: "balance-sheet", render: (d) => renderBalanceSheet(d) },
  { id: "scorecard", title: "Four Bottom Lines Scorecard", description: "People, Planet, Profit, and Ownership — graded.", endpoint: "scorecard", render: (d) => renderScorecard(d) },
  { id: "equity-schedule", title: "Member Equity Schedule", description: "Ownership structure, capital accounts, and governance rights.", endpoint: "equity-schedule", render: (d) => renderEquitySchedule(d) },
  { id: "ecosystem-map", title: "Ecosystem Map", description: "Everyone you work with and how value flows through the system.", endpoint: "ecosystem-map", render: (d) => renderEcosystemMap(d) },
];

type DocState = { status: "idle" | "loading" | "done" | "error"; doc?: Record<string, unknown>; filledCount?: number; total?: number };

type Props = { businessId: string; businessName: string };

export default function DocumentsTab({ businessId, businessName }: Props) {
  const [states, setStates] = useState<Record<string, DocState>>(
    Object.fromEntries(DOCS.map((d) => [d.id, { status: "idle" }]))
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<string | null>(null);

  useEffect(() => {
    if (printTarget) window.print();
  }, [printTarget]);

  useEffect(() => {
    function clear() { setPrintTarget(null); }
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  async function generate(docId: string, endpoint: string) {
    setStates((s) => ({ ...s, [docId]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/journey/documents/${businessId}/${endpoint}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStates((s) => ({ ...s, [docId]: { status: "done", doc: data.doc, filledCount: data.filledCount, total: data.total } }));
      setExpanded(docId);
    } catch {
      setStates((s) => ({ ...s, [docId]: { status: "error" } }));
    }
  }

  return (
    <div className="tab-panel docs-tab">
      <h2>Documents</h2>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Fill in the Plan tab first — the more you complete, the sharper these documents will be. Generate any document at any time; Gemini will note gaps.
      </p>

      <div className="docs-list">
        {DOCS.map((doc) => {
          const state = states[doc.id];
          const isExpanded = expanded === doc.id;
          return (
            <div key={doc.id} className={`doc-card print-card${isExpanded ? " doc-card--expanded" : ""}${printTarget === doc.id ? " print-card--target" : ""}`}>
              <div className="doc-card__header" onClick={() => state.status === "done" && setExpanded(isExpanded ? null : doc.id)}>
                <div className="doc-card__info no-print">
                  <h3 className="doc-card__title">{doc.title}</h3>
                  <p className="doc-card__desc">{doc.description}</p>
                  {state.status === "done" && state.filledCount !== undefined && (
                    <p className="doc-card__fill-note">{state.filledCount}/{state.total} plan fields used</p>
                  )}
                </div>
                <div className="doc-card__actions no-print">
                  {state.status === "idle" && (
                    <button className="btn btn--primary btn--sm" onClick={(e) => { e.stopPropagation(); generate(doc.id, doc.endpoint); }}>
                      Generate
                    </button>
                  )}
                  {state.status === "loading" && (
                    <button className="btn btn--ghost btn--sm" disabled>Generating…</button>
                  )}
                  {state.status === "done" && (
                    <>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={(e) => { e.stopPropagation(); downloadMarkdown(`${businessName} — ${doc.title}.md`, jsonToMarkdown(state.doc!, doc.title)); }}
                      >
                        Download .md
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={(e) => { e.stopPropagation(); if (!isExpanded) setExpanded(doc.id); setPrintTarget(doc.id); }}
                      >
                        Print / Save PDF
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); generate(doc.id, doc.endpoint); }}>
                        Regenerate
                      </button>
                      <span className="doc-card__toggle">{isExpanded ? "▲" : "▼"}</span>
                    </>
                  )}
                  {state.status === "error" && (
                    <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); generate(doc.id, doc.endpoint); }}>
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {state.status === "done" && isExpanded && state.doc && (
                <div className="doc-card__content print-doc">
                  <div className="print-only" style={{ marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid #ccc" }}>
                    <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>{doc.title}</p>
                    <p style={{ fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{businessName} · Generated {printDate()}</p>
                  </div>
                  {doc.render(state.doc)}
                </div>
              )}
              {state.status === "error" && (
                <p className="doc-error">Something went wrong. Make sure your Plan tab has enough fields filled in, then retry.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

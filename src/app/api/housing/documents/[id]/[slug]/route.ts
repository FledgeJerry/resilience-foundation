import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DOCS: Record<string, { title: string; buildPrompt: (p: ProjectData) => string }> = {
  "offering-memo": {
    title: "Share Offering Memorandum",
    buildPrompt: (p) => `You are writing a Share Offering Memorandum for a community-owned housing project called the Sunshine House model.

PROJECT: ${p.name}
ADDRESS: ${p.address || "TBD"}
PURCHASE PRICE: $${p.purchasePrice?.toLocaleString() || "TBD"}
RENOVATION BUDGET: $${p.renovationCost?.toLocaleString() || "TBD"}
POST-RENOVATION VALUE: $${p.postRenoValue?.toLocaleString() || "TBD"}
STATUS: ${p.status}

SHARE STRUCTURE:
Total shares: ${p.totalShares}
Treasury reserve: ${p.treasuryReservePct}% (${Math.round(p.totalShares * p.treasuryReservePct / 100)} shares held by treasury)
Public shares: ${p.totalShares - Math.round(p.totalShares * p.treasuryReservePct / 100)}
Issue price per share: $${p.issuePrice?.toFixed(2) || "TBD"}
Post-renovation value per share: $${p.perShareValue?.toFixed(2) || "TBD"}

GOVERNANCE:
Voting: One person, one vote (regardless of share count)
Quorum: ${p.quorumPct}%
Simple majority threshold: ${p.simpleThreshold}%
Supermajority threshold: ${p.superThreshold}%
Meeting cadence: ${p.meetingCadence}

SHAREHOLDERS (${p.shareholders.length} registered):
${p.shareholders.filter(s => !s.isTreasury).map(s => `- ${s.name}: ${s.shareCount} shares, $${s.amountPaid} paid`).join("\n") || "None registered yet"}

Write a clear, plain-language Share Offering Memorandum in markdown. Include:
1. Executive Summary (what this is, the deal in plain terms)
2. The Property (address, purchase/reno plan, ARV)
3. The Offering (share structure, issue price, what investors get)
4. Use of Funds
5. Governance (voting, meetings, transparency)
6. Risks and Disclosures (honest, plain language — not legal boilerplate)
7. How to Participate (contact/next steps)

Write like a neighbor explaining this at a kitchen table — honest, clear, no jargon. Use "you" and "we." About 600–800 words.`,
  },

  "shareholder-agreement": {
    title: "Shareholder Agreement",
    buildPrompt: (p) => `You are writing a Shareholder Agreement for a community-owned housing project.

PROJECT: ${p.name}
ADDRESS: ${p.address || "TBD"}
TOTAL SHARES: ${p.totalShares}
ISSUE PRICE: $${p.issuePrice?.toFixed(2) || "TBD"}

GOVERNANCE TERMS:
- Voting: One person, one vote (regardless of share count)
- Quorum: ${p.quorumPct}% for valid meetings
- Simple majority (${p.simpleThreshold}%): day-to-day decisions
- Supermajority (${p.superThreshold}%): major decisions (new members, large expenses, sale)
- Meeting cadence: ${p.meetingCadence}
- Dispute resolution: ${p.disputeProcess}

SHAREHOLDER RIGHTS:
- One vote regardless of shares held
- Proportional share of treasury surplus as voted
- Full treasury transparency at all times
- Proportional proceeds if property is sold
- Right to transfer shares (with community right of first refusal)

SHAREHOLDER RESPONSIBILITIES:
- Attend meetings (quorum requirement applies)
- Participate in decisions
- Respect democratic outcomes

Write a clear Shareholder Agreement in markdown. It should be plain-language but legally substantive. Include:
1. Parties and Definitions
2. Share Ownership and Transfer
3. Voting Rights and Governance
4. Treasury and Distributions
5. Meetings
6. Exit and Transfer of Shares
7. Dispute Resolution
8. Signatures block

Plain language, community-first tone. About 700–900 words.`,
  },

  "bylaws": {
    title: "Governance & Bylaws",
    buildPrompt: (p) => `You are writing Governance Bylaws for a community-owned housing cooperative.

PROJECT: ${p.name}
GOVERNANCE STRUCTURE:
- Voting: One person, one vote
- Quorum: ${p.quorumPct}%
- Simple majority: ${p.simpleThreshold}% — routine decisions
- Supermajority: ${p.superThreshold}% — major decisions (capital expenditures, new members, sale)
- Meeting cadence: ${p.meetingCadence}
- Dispute resolution: ${p.disputeProcess}
- Treasury: all income goes to treasury first; expenses paid from treasury; surplus voted on by shareholders

Write clear, plain-language Bylaws in markdown. Include:
1. Name and Purpose
2. Membership (who can be a shareholder, how shares are acquired)
3. Meetings (schedule, notice, quorum, how votes are counted)
4. Decision Types (simple majority vs supermajority — with examples of each)
5. The Treasury (income, expenses, surplus, rainy-day fund, how distributions work)
6. Officers / Stewards (optional but recommended roles — treasurer, secretary, facilitator)
7. Amendments (how bylaws can be changed — supermajority required)
8. Dissolution

Community-first tone. About 700 words.`,
  },

  "treasury-report": {
    title: "Treasury Report",
    buildPrompt: (p) => {
      const income = p.entries.filter(e => e.type === "INCOME").reduce((s, e) => s + e.amount, 0);
      const expenses = p.entries.filter(e => e.type === "EXPENSE").reduce((s, e) => s + e.amount, 0);
      const surplus = income - expenses;
      const recentEntries = p.entries.slice(0, 20).map(e =>
        `${new Date(e.date).toLocaleDateString()} | ${e.type} | ${e.category} | ${e.description || ""} | $${e.amount.toLocaleString()}`
      ).join("\n");
      const votes = p.votes.slice(0, 10).map(v =>
        `${v.periodLabel}: surplus $${v.surplus.toLocaleString()}, decision: ${v.decision}, distributed: $${v.amountDistributed.toLocaleString()}${v.notes ? ` (${v.notes})` : ""}`
      ).join("\n");

      return `You are writing a Treasury Report for a community-owned housing project.

PROJECT: ${p.name}
REPORTING PERIOD: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}

SHARE STRUCTURE:
Total shares: ${p.totalShares} | Treasury reserve: ${p.treasuryReservePct}%

TOTALS TO DATE:
Total income: $${income.toLocaleString()}
Total expenses: $${expenses.toLocaleString()}
Net surplus: $${surplus.toLocaleString()}

RECENT LEDGER ENTRIES:
${recentEntries || "No entries yet"}

PAST SURPLUS VOTES:
${votes || "No votes recorded yet"}

Write a clear Treasury Report in markdown. Include:
1. Summary (one paragraph — how we're doing in plain terms)
2. Income Summary (by category)
3. Expense Summary (by category)
4. Net Position
5. Recent Ledger (table format)
6. Surplus Vote History
7. What's Coming (any known upcoming expenses or decisions)

Open-books tone — write like you're explaining the finances at a monthly meeting. Every number should be understandable by someone who has never read a financial report.`;
    },
  },
};

type ProjectData = {
  name: string;
  address: string | null;
  status: string;
  purchasePrice: number | null;
  renovationCost: number | null;
  postRenoValue: number | null;
  totalShares: number;
  treasuryReservePct: number;
  issuePrice: number | null;
  perShareValue: number | null;
  quorumPct: number;
  simpleThreshold: number;
  superThreshold: number;
  meetingCadence: string;
  disputeProcess: string;
  shareholders: { name: string; shareCount: number; amountPaid: number; isTreasury: boolean }[];
  entries: { type: string; category: string; description: string | null; amount: number; date: Date }[];
  votes: { periodLabel: string; surplus: number; decision: string; amountDistributed: number; notes: string | null }[];
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; slug: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, slug } = await params;

    if (!DOCS[slug]) return NextResponse.json({ error: "Unknown document" }, { status: 404 });

    const membership = await prisma.housingMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const project = await prisma.housingProject.findUnique({
      where: { id: projectId },
      include: {
        shareholders: true,
        treasuryEntries: { orderBy: { date: "desc" } },
        treasuryVotes: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const publicShares = project.totalShares - Math.round(project.totalShares * project.treasuryReservePct / 100);
    const totalRaise = (project.purchasePrice ?? 0) + (project.renovationCost ?? 0);
    const issuePrice = publicShares > 0 && totalRaise > 0 ? totalRaise / publicShares : null;
    const perShareValue = project.postRenoValue && project.totalShares > 0 ? project.postRenoValue / project.totalShares : null;

    const data: ProjectData = {
      name: project.name,
      address: project.address,
      status: project.status,
      purchasePrice: project.purchasePrice,
      renovationCost: project.renovationCost,
      postRenoValue: project.postRenoValue,
      totalShares: project.totalShares,
      treasuryReservePct: project.treasuryReservePct,
      issuePrice,
      perShareValue,
      quorumPct: project.quorumPct,
      simpleThreshold: project.simpleThreshold,
      superThreshold: project.superThreshold,
      meetingCadence: project.meetingCadence,
      disputeProcess: project.disputeProcess,
      shareholders: project.shareholders,
      entries: project.treasuryEntries,
      votes: project.treasuryVotes,
    };

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(DOCS[slug].buildPrompt(data));
    const content = result.response.text();

    return NextResponse.json({ content, title: DOCS[slug].title });
  } catch (err) {
    console.error("GET housing document:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

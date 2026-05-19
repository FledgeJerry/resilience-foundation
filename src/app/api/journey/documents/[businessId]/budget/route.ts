import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-21","JP-22","JP-23","JP-28","JP-29","JP-11","JP-15","JP-16"];

export async function GET(req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { businessId } = await params;

    const member = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    const entries = await prisma.businessPlanEntry.findMany({ where: { businessId, fieldId: { in: FIELDS } } });
    const fields: Record<string, string> = {};
    for (const e of entries) fields[e.fieldId] = e.value;

    const txs = await prisma.businessTransaction.findMany({ where: { businessId }, orderBy: { date: "asc" } });
    const txSummary = txs.length > 0
      ? txs.map((t) => `${t.type} | ${t.category} | $${t.amount} | ${t.description ?? ""}`).join("\n")
      : "No transactions recorded yet.";

    const summary = FIELDS.map((id) => `${PLAN_FIELD_MAP[id]}: ${fields[id] || "[not filled in]"}`).join("\n");

    const prompt = `You are building a Startup Budget for "${biz?.name || "this business"}".

Business plan data:
${summary}

Actual transactions recorded:
${txSummary}

Return a JSON object with exactly these keys:

- "startupCosts": Array of objects with { "category": string, "item": string, "amount": number, "notes": string }. List every startup cost line item. Infer reasonable amounts if not specified.
- "totalStartupCost": number — sum of all startup costs.
- "monthlyOperatingCosts": Array of objects with { "category": string, "item": string, "monthlyAmount": number }. List every recurring monthly cost.
- "totalMonthlyBurn": number — sum of monthly costs.
- "fundingSources": Array of objects with { "source": string, "amount": number, "type": string }. Types: "Grant", "Member equity", "Loan", "Self-funded", "Other".
- "totalFunding": number — sum of all funding.
- "fundingGap": number — totalStartupCost minus totalFunding (can be 0 or negative if overfunded).
- "notes": string — 2–3 sentences of budget narrative and key assumptions.

Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("budget error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

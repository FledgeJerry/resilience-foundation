import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-15","JP-21","JP-22","JP-28","JP-29","JP-30","JP-33","JP-34"];

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

    const txs = await prisma.businessTransaction.findMany({ where: { businessId } });
    const totalIncome = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

    const summary = FIELDS.map((id) => `${PLAN_FIELD_MAP[id]}: ${fields[id] || "[not filled in]"}`).join("\n");

    const prompt = `You are building a projected Opening Day Balance Sheet for "${biz?.name || "this business"}".

Business plan data:
${summary}

Actual transactions so far — Total income: $${totalIncome}, Total expenses: $${totalExpense}

Return a JSON object with exactly these keys. All amounts are numbers (dollars).

- "assets": Object with:
  - "currentAssets": Array of { "item": string, "amount": number } — cash, inventory, receivables, prepaid expenses
  - "fixedAssets": Array of { "item": string, "amount": number } — equipment, furniture, vehicles, leasehold improvements
  - "totalCurrentAssets": number
  - "totalFixedAssets": number
  - "totalAssets": number

- "liabilities": Object with:
  - "currentLiabilities": Array of { "item": string, "amount": number } — accounts payable, short-term loans, deferred revenue
  - "longTermLiabilities": Array of { "item": string, "amount": number } — long-term loans, notes payable
  - "totalCurrentLiabilities": number
  - "totalLongTermLiabilities": number
  - "totalLiabilities": number

- "equity": Object with:
  - "items": Array of { "item": string, "amount": number } — member equity, retained earnings/deficit
  - "totalEquity": number

- "balanceCheck": boolean — true if totalAssets equals totalLiabilities + totalEquity (within $1).
- "asOf": string — "Projected Opening Day"
- "notes": string — 2–3 sentences explaining key assumptions.

Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("balance-sheet error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

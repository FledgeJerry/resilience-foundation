import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-11","JP-12","JP-13","JP-21","JP-23","JP-24","JP-25","JP-26","JP-27","JP-36","JP-37","JP-39"];

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

    const summary = FIELDS.map((id) => `${PLAN_FIELD_MAP[id]}: ${fields[id] || "[not filled in]"}`).join("\n");

    const prompt = `You are building a 3-Year Financial Pro Forma for "${biz?.name || "this business"}".

Business plan data:
${summary}

Return a JSON object with exactly these keys:

- "assumptions": Array of strings — 4–6 key financial assumptions behind the projections.
- "year1": Object with { "revenue": number, "cogs": number, "grossProfit": number, "operatingExpenses": number, "netIncome": number, "monthlyBreakEven": string }
- "year2": Object with { "revenue": number, "cogs": number, "grossProfit": number, "operatingExpenses": number, "netIncome": number }
- "year3": Object with { "revenue": number, "cogs": number, "grossProfit": number, "operatingExpenses": number, "netIncome": number }
- "revenueGrowthRate": string — e.g. "33% Year 1→2, 25% Year 2→3"
- "surplusDistribution": string — how net income/surplus will be distributed (per plan).
- "risks": Array of strings — 3–4 key financial risks.
- "notes": string — 2–3 sentences summarizing the financial story.

Use round numbers. If data is missing, make reasonable assumptions for a business of this type and note them in assumptions. Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("proforma error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

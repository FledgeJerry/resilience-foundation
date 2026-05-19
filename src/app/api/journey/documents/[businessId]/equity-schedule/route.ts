import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-30","JP-31","JP-32","JP-33","JP-34","JP-35","JP-36","JP-37","JP-39","JP-40","JP-21","JP-24","JP-25","JP-26"];

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

    const prompt = `You are building a Member Equity and Ownership Schedule for "${biz?.name || "this business"}".

Business plan data:
${summary}

Return a JSON object with exactly these keys:

- "ownershipModel": string — 2–3 sentences describing the ownership structure and governance model.
- "memberBuyIn": Object with { "amount": number, "paymentTerms": string, "description": string }.
- "foundingMembers": Array of { "role": string, "equityShare": string, "capitalContribution": number, "vestingSchedule": string }. Create 1 generic row per founder if count is known, or 3–4 representative rows.
- "newMemberPath": string — how future members earn into ownership.
- "capitalAccountSchedule": Array of { "year": string, "members": number, "totalCapital": number, "perMemberAccount": number, "patronageDistributed": number }. Show Year 0 (founding) through Year 3.
- "surplusDistribution": Object with { "reinvested": string, "memberPatronage": string, "reserve": string, "community": string }. Each is a percentage string like "40%".
- "maxWageRatio": string — max ratio of highest to lowest paid member (e.g. "4:1").
- "governanceRights": Array of strings — 3–5 specific voting and governance rights members have.
- "notes": string — 2–3 sentences on equity philosophy and key assumptions.

Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("equity-schedule error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-36","JP-37","JP-38","JP-39","JP-40","JP-24","JP-25","JP-26","JP-35","JP-45"];

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

    const prompt = `You are building a Four Bottom Lines Scorecard for "${biz?.name || "this business"}".

The Four Bottom Lines are: People, Planet, Profit, and Ownership.

Business plan data:
${summary}

Return a JSON object with exactly these keys:

- "people": Object with:
  - "commitments": Array of strings — 3–5 specific people commitments from the plan.
  - "metrics": Array of { "metric": string, "target": string, "description": string } — 3–4 measurable KPIs (e.g. "Living wage floor", "$18/hr minimum", "All worker-owners earn at least this from day one").
  - "grade": "A" | "B" | "C" | "D" — based on strength of commitments.

- "planet": Object with same shape — commitments, metrics, grade.

- "profit": Object with same shape — commitments, metrics, grade. Include revenue targets and surplus distribution.

- "ownership": Object with same shape — commitments, metrics, grade. Include governance practices and member voice.

- "summary": string — 3–4 sentences assessing overall Four Bottom Lines alignment. Be honest about gaps.
- "strengths": Array of strings — 2–3 standout commitments.
- "gaps": Array of strings — 2–3 areas where more specificity or commitment is needed.

Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("scorecard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

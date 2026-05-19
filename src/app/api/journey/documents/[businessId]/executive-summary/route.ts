import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = [
  "JP-01","JP-03","JP-04","JP-06","JP-08","JP-09",
  "JP-11","JP-12","JP-13","JP-21","JP-28","JP-29",
  "JP-30","JP-31","JP-32","JP-35","JP-36","JP-37","JP-45",
];

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

    const summary = FIELDS.map((id) => `${PLAN_FIELD_MAP[id]} (${id}): ${fields[id] || "[not yet filled in]"}`).join("\n");

    const prompt = `You are writing a professional Executive Summary for a ${biz?.type === "COOP" ? "worker-owned cooperative" : "small business"} called "${biz?.name || "this business"}".

Here is their business plan data:
${summary}

Return a JSON object with exactly these keys. Each value is 2–4 sentences of clean, professional prose. Write in first person plural ("we", "our"). No jargon. If a field says "[not yet filled in]", synthesize from adjacent fields or write a brief placeholder in brackets.

Keys:
- "businessName": The business name.
- "tagline": A one-sentence mission summary.
- "overview": Who we are, what we do, where we operate, and why this structure.
- "problem": The specific problem this business addresses.
- "solution": What we've built and how it solves the problem.
- "market": The opportunity — size, who's underserved, why now.
- "team": Who's building this and what ownership means to them.
- "financials": Startup capital needed, funding plan, and revenue model.
- "impact": How the broader community is stronger because we exist.
- "vision": The 3-year dream. Bold, human, specific.

Return ONLY the JSON object. No explanation, no markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("executive-summary error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

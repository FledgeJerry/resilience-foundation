import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-01","JP-02","JP-03","JP-04","JP-05","JP-06","JP-08","JP-11","JP-12","JP-13","JP-21","JP-28","JP-45"];

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

    const prompt = `You are writing a compelling community pitch for "${biz?.name || "this business"}".

Business plan data:
${summary}

Return a JSON object with exactly these keys:
- "hook": One punchy opening sentence. Put the audience in the problem. No fluff.
- "problem": 2–3 sentences. The pain, why it exists, who feels it.
- "solution": 2–3 sentences. What we're building and how it solves the problem.
- "whyUs": 1–2 sentences. Why this team, why now.
- "traction": 1–2 sentences. What's already happening — early customers, community support, partnerships.
- "ask": 1 sentence. What do you need? Funding, partners, customers, volunteers?
- "vision": 1 sentence. The bold future you're building toward.
- "ninetySecondScript": A flowing 90-second spoken pitch (approx 200 words) that a founder could read aloud at 99 Problems. Natural, passionate, community-first voice.

Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("pitch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

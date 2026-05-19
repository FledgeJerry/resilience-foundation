import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-01","JP-03","JP-06","JP-07","JP-11","JP-12","JP-13","JP-14","JP-15","JP-16","JP-17","JP-18","JP-41","JP-42","JP-43","JP-45"];

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

    const prompt = `You are completing a Business Model Canvas for "${biz?.name || "this business"}".

Business plan data:
${summary}

Return a JSON object with exactly the 9 standard Business Model Canvas blocks. Each value is a bulleted list as a plain string (use "• " as bullet prefix, separate items with newlines). Keep each block to 3–5 bullets. Be concrete and specific.

Keys:
- "keyPartners": Key Partners — suppliers, collaborators, community anchors.
- "keyActivities": Key Activities — the most important things the business does.
- "keyResources": Key Resources — physical, human, financial, intellectual assets required.
- "valuePropositions": Value Propositions — the core value delivered to customers.
- "customerRelationships": Customer Relationships — how you build and keep them.
- "channels": Channels — how customers find and receive value.
- "customerSegments": Customer Segments — who the business serves.
- "costStructure": Cost Structure — biggest costs to operate.
- "revenueStreams": Revenue Streams — how the business earns money.

Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("canvas error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

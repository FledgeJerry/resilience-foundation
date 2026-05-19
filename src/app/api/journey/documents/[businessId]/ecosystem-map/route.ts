import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_FIELD_MAP } from "@/lib/journey-plan-content";

const FIELDS = ["JP-06","JP-07","JP-09","JP-41","JP-42","JP-43","JP-44","JP-45","JP-11","JP-12"];

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

    const contacts = await prisma.contact.findMany({ where: { businessId } });
    const contactSummary = contacts.length > 0
      ? contacts.map((c) => `${c.type}: ${c.name}${c.company ? ` (${c.company})` : ""}`).join("\n")
      : "No contacts recorded yet.";

    const summary = FIELDS.map((id) => `${PLAN_FIELD_MAP[id]}: ${fields[id] || "[not filled in]"}`).join("\n");

    const prompt = `You are building an Ecosystem Map for "${biz?.name || "this business"}".

Business plan data:
${summary}

Contacts in their CRM:
${contactSummary}

Return a JSON object describing the business's full ecosystem — everyone they interact with and how value flows.

Keys:
- "center": string — one sentence describing the business and its core purpose.
- "customers": Array of { "name": string, "type": string, "relationship": string, "valueReceived": string }. List customer segments and key accounts.
- "suppliers": Array of { "name": string, "what": string, "relationship": string }. What you buy from them.
- "partners": Array of { "name": string, "type": "Collaborator" | "Community anchor" | "Co-op" | "Mutual aid" | "Advisor", "relationship": string }.
- "resourceProviders": Array of { "name": string, "resource": string }. Funders, landlords, lenders, equipment providers.
- "valueFlows": Array of { "from": string, "to": string, "what": string }. Describe 4–6 key value flows in the ecosystem.
- "coopConnections": Array of strings — other cooperatives or solidarity economy orgs connected to this business.
- "communityImpact": string — 2–3 sentences on how value stays in the community.
- "gaps": Array of strings — 2–3 ecosystem relationships that are missing or need strengthening.

Return ONLY the JSON object. No markdown fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = JSON.parse(text);
    return NextResponse.json({ doc, filledCount: Object.keys(fields).length, total: FIELDS.length });
  } catch (err) {
    console.error("ecosystem-map error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

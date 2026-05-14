import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const shareholderId = searchParams.get("shareholderId");
    if (!shareholderId) return NextResponse.json({ error: "shareholderId required" }, { status: 400 });

    const membership = await prisma.housingMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [project, renter] = await Promise.all([
      prisma.housingProject.findUnique({ where: { id: projectId } }),
      prisma.housingShareHolder.findUnique({ where: { id: shareholderId } }),
    ]);
    if (!project || !renter) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const leaseStart = renter.moveInDate
      ? new Date(renter.moveInDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "TBD";
    const leaseEnd = renter.leaseEndDate
      ? new Date(renter.leaseEndDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "Month-to-month";
    const leaseTerm = renter.leaseEndDate ? `Fixed term ending ${leaseEnd}` : "Month-to-month tenancy";

    const prompt = `You are writing a Residential Lease Agreement for a community-owned housing cooperative.

PROPERTY
Name: ${project.name}
Address: ${project.address || "TBD"}
Cooperative: Fledge Fractals / Sunshine House community ownership model

TENANT
Name: ${renter.name}
Email: ${renter.email || "not provided"}
Phone: ${renter.phone || "not provided"}
Number of occupants: ${renter.occupantCount ?? 1}
Emergency contact: ${renter.emergencyContactName || "not provided"}${renter.emergencyContactPhone ? ` — ${renter.emergencyContactPhone}` : ""}

LEASE TERMS
Lease start: ${leaseStart}
Lease type: ${leaseTerm}
Monthly rent: $${renter.monthlyRentPaid?.toLocaleString() || "TBD"}
Security deposit: $${renter.securityDeposit?.toLocaleString() || "TBD"}
Rent due: 1st of each month
Late fee: After 5-day grace period

RENTER EQUITY
This is a community ownership property. As a renter, ${renter.name} earns ownership shares each month equivalent to the principal portion of a reference mortgage payment on the property value. Shares are drawn from the treasury reserve. This is not a standard rental — the tenant is building equity toward ownership.
Shares earned to date: ${renter.shareCount}
Equity balance: $${renter.equityBalance.toFixed(2)}

GOVERNANCE
Voting: One person, one vote
Quorum: ${project.quorumPct}%
Meetings: ${project.meetingCadence}
Renters with shares are full voting members.

Write a clear, plain-language Residential Lease Agreement in markdown. Include:
1. Parties (landlord = the cooperative, tenant = renter)
2. Property Description
3. Lease Term and Rent
4. Security Deposit
5. Renter Equity Program (explain how the tenant earns shares, what it means for them)
6. Occupants
7. Use of Property (standard residential use, no subletting without approval)
8. Maintenance Responsibilities (tenant vs. cooperative)
9. Entry and Notice (24-hour notice for non-emergency entry)
10. Termination (notice period — 30 days for month-to-month, per term for fixed)
11. Governance Participation Rights
12. Signatures block (tenant + cooperative representative)

Plain language, community-first tone. Honest about what this is — a cooperative ownership model, not a standard landlord-tenant relationship. About 800–1000 words.`;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text();

    return NextResponse.json({ content, title: `Lease Agreement — ${renter.name}` });
  } catch (err) {
    console.error("GET housing lease:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

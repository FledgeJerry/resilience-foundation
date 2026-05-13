import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getMembership(userId: string, projectId: string) {
  return prisma.housingMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const membership = await getMembership(session.user.id, id);
    if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const project = await prisma.housingProject.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        shareholders: { orderBy: [{ isTreasury: "asc" }, { createdAt: "asc" }] },
        treasuryEntries: { orderBy: { date: "desc" } },
        treasuryVotes: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(project);
  } catch (err) {
    console.error("GET /api/housing/projects/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const membership = await getMembership(session.user.id, id);
    if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    // Whitelist updatable fields
    const allowed = [
      "name", "status", "address", "purchasePrice", "renovationCost", "postRenoValue",
      "targetCloseDate", "notes", "totalShares", "treasuryReservePct",
      "quorumPct", "simpleThreshold", "superThreshold", "meetingCadence", "disputeProcess",
      "monthlyRent", "propertyTax", "insurance", "maintenanceReserve", "rainyDayPct",
      "mortgageInterestRate", "mortgageLoanTerm",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    if (data.targetCloseDate && typeof data.targetCloseDate === "string") {
      data.targetCloseDate = new Date(data.targetCloseDate);
    }

    const project = await prisma.housingProject.update({ where: { id }, data });
    return NextResponse.json(project);
  } catch (err) {
    console.error("PATCH /api/housing/projects/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const membership = await getMembership(session.user.id, id);
    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.housingProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/housing/projects/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

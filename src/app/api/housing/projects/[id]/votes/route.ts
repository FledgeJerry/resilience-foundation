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

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const votes = await prisma.treasuryVote.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(votes);
  } catch (err) {
    console.error("GET votes:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { periodLabel, surplus, decision, amountDistributed, notes } = await req.json();
    if (!periodLabel || surplus === undefined || !decision) {
      return NextResponse.json({ error: "periodLabel, surplus, decision required" }, { status: 400 });
    }

    const vote = await prisma.treasuryVote.create({
      data: {
        projectId,
        periodLabel,
        surplus: Number(surplus),
        decision,
        amountDistributed: Number(amountDistributed ?? 0),
        notes,
      },
    });

    return NextResponse.json(vote, { status: 201 });
  } catch (err) {
    console.error("POST votes:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!await getMembership(session.user.id, projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { voteId } = await req.json();
    if (!voteId) return NextResponse.json({ error: "voteId required" }, { status: 400 });

    await prisma.treasuryVote.delete({ where: { id: voteId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE votes:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

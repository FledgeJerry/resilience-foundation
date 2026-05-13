import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkMembership(userId: string, entityType: string, entityId: string) {
  if (entityType === "COOP") {
    return prisma.coopMember.findUnique({ where: { coopId_userId: { coopId: entityId, userId } } });
  }
  return prisma.housingMember.findUnique({ where: { projectId_userId: { projectId: entityId, userId } } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: proposalId } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.status !== "OPEN") {
    return NextResponse.json({ error: "Voting is only allowed on OPEN proposals" }, { status: 400 });
  }

  if (!await checkMembership(session.user.id, proposal.entityType, proposal.entityId)) {
    return NextResponse.json({ error: "Not a member of this entity" }, { status: 403 });
  }

  const { choice, comment } = await req.json();
  if (!["YES", "NO", "ABSTAIN"].includes(choice)) {
    return NextResponse.json({ error: "choice must be YES | NO | ABSTAIN" }, { status: 400 });
  }

  const vote = await prisma.vote.upsert({
    where: { proposalId_userId: { proposalId, userId: session.user.id } },
    create: { proposalId, userId: session.user.id, choice, comment },
    update: { choice, comment },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(vote);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: proposalId } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== "OPEN") {
    return NextResponse.json({ error: "Cannot retract vote" }, { status: 400 });
  }

  await prisma.vote.deleteMany({ where: { proposalId, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}

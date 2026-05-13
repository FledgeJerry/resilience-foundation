import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkMembership(userId: string, entityType: string, entityId: string) {
  if (entityType === "COOP") {
    return prisma.coopMember.findUnique({ where: { coopId_userId: { coopId: entityId, userId } } });
  }
  return prisma.housingMember.findUnique({ where: { projectId_userId: { projectId: entityId, userId } } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      proposedBy: { select: { id: true, name: true } },
      votes: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!await checkMembership(session.user.id, proposal.entityType, proposal.entityId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ...proposal, currentUserId: session.user.id });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!await checkMembership(session.user.id, proposal.entityType, proposal.entityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only proposer can edit DRAFT content
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (proposal.proposedById === session.user.id) {
    if ("title" in body) data.title = body.title;
    if ("body" in body) data.body = body.body;
    if ("threshold" in body) data.threshold = Number(body.threshold);
    if ("deadline" in body) data.deadline = body.deadline ? new Date(body.deadline) : null;
  }

  // Any member can see status changes via separate /status endpoint
  const updated = await prisma.proposal.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.proposedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (proposal.status !== "DRAFT") {
    return NextResponse.json({ error: "Can only delete DRAFT proposals" }, { status: 400 });
  }

  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

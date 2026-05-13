import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkMembership(userId: string, entityType: string, entityId: string) {
  if (entityType === "COOP") {
    return prisma.coopMember.findUnique({ where: { coopId_userId: { coopId: entityId, userId } } });
  }
  return prisma.housingMember.findUnique({ where: { projectId_userId: { projectId: entityId, userId } } });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  if (!entityType || !entityId) return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });

  if (!await checkMembership(session.user.id, entityType, entityId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const proposals = await prisma.proposal.findMany({
    where: { entityType: entityType as "COOP" | "HOUSING", entityId },
    include: {
      proposedBy: { select: { id: true, name: true } },
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(proposals);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType, entityId, title, body, threshold, deadline } = await req.json();
  if (!entityType || !entityId || !title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "entityType, entityId, title, and body are required" }, { status: 400 });
  }

  if (!await checkMembership(session.user.id, entityType, entityId)) {
    return NextResponse.json({ error: "Not a member of this entity" }, { status: 403 });
  }

  const proposal = await prisma.proposal.create({
    data: {
      entityType,
      entityId,
      title: title.trim(),
      body: body.trim(),
      proposedById: session.user.id,
      threshold: threshold != null ? Number(threshold) : 51,
      deadline: deadline ? new Date(deadline) : undefined,
    },
    include: { proposedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(proposal, { status: 201 });
}

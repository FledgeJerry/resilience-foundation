import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkMembership(userId: string, entityType: string, entityId: string) {
  if (entityType === "COOP") {
    return prisma.coopMember.findUnique({ where: { coopId_userId: { coopId: entityId, userId } } });
  }
  return prisma.housingMember.findUnique({ where: { projectId_userId: { projectId: entityId, userId } } });
}

// Record in-person / meeting votes for members without accounts
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.status !== "OPEN") {
    return NextResponse.json({ error: "Proposal is not open" }, { status: 400 });
  }

  if (!await checkMembership(session.user.id, proposal.entityType, proposal.entityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { offchainYes, offchainNo, offchainAbstain } = await req.json();
  const updated = await prisma.proposal.update({
    where: { id },
    data: {
      ...(offchainYes != null && { offchainYes: Math.max(0, Number(offchainYes)) }),
      ...(offchainNo != null && { offchainNo: Math.max(0, Number(offchainNo)) }),
      ...(offchainAbstain != null && { offchainAbstain: Math.max(0, Number(offchainAbstain)) }),
    },
  });
  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkMembership(userId: string, entityType: string, entityId: string) {
  if (entityType === "COOP") {
    return prisma.coopMember.findUnique({ where: { coopId_userId: { coopId: entityId, userId } } });
  }
  return prisma.housingMember.findUnique({ where: { projectId_userId: { projectId: entityId, userId } } });
}

// Compute result when closing a proposal
function computeResult(
  votes: { choice: string }[],
  offchainYes: number,
  offchainNo: number,
  offchainAbstain: number,
  threshold: number
) {
  const yes = votes.filter(v => v.choice === "YES").length + offchainYes;
  const no = votes.filter(v => v.choice === "NO").length + offchainNo;
  const decisive = yes + no;
  if (decisive === 0) return "FAILED"; // no votes → failed
  const yesPct = (yes / decisive) * 100;
  return yesPct >= threshold ? "PASSED" : "FAILED";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { votes: { select: { choice: true } } },
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only proposer can change status
  if (proposal.proposedById !== session.user.id) {
    return NextResponse.json({ error: "Only the proposer can change status" }, { status: 403 });
  }

  if (!await checkMembership(session.user.id, proposal.entityType, proposal.entityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = await req.json(); // "open" | "close" | "withdraw"
  let newStatus: string;

  if (action === "open") {
    if (proposal.status !== "DRAFT") return NextResponse.json({ error: "Can only open DRAFT proposals" }, { status: 400 });
    newStatus = "OPEN";
  } else if (action === "close") {
    if (proposal.status !== "OPEN") return NextResponse.json({ error: "Can only close OPEN proposals" }, { status: 400 });
    newStatus = computeResult(proposal.votes, proposal.offchainYes, proposal.offchainNo, proposal.offchainAbstain, proposal.threshold);
  } else if (action === "withdraw") {
    if (!["DRAFT", "OPEN"].includes(proposal.status)) {
      return NextResponse.json({ error: "Can only withdraw DRAFT or OPEN proposals" }, { status: 400 });
    }
    newStatus = "WITHDRAWN";
  } else {
    return NextResponse.json({ error: "action must be open | close | withdraw" }, { status: 400 });
  }

  const updated = await prisma.proposal.update({ where: { id }, data: { status: newStatus as "OPEN" | "CLOSED" | "PASSED" | "FAILED" | "WITHDRAWN" } });
  return NextResponse.json(updated);
}

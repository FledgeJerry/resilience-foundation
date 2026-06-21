import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public read-only endpoint — cross-site metrics for lansing.love governance dashboard
export async function GET() {
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [
    totalEntrepreneurs,
    activeCoops,
    housingProjects,
    coopsWithHandbook,
    stageBreakdown,
    minorityOwned,
    womanOwned,
    veteranOwned,
    disabilityOwned,
    recentBusinesses,
    handbookEntries,
  ] = await Promise.all([
    prisma.business.count({ where: { isAdminCreated: true } }),
    prisma.coop.count(),
    prisma.housingProject.count(),
    prisma.coop.count({ where: { handbookEntries: { some: {} } } }),
    prisma.business.groupBy({
      by: ["stage"],
      where: { isAdminCreated: true },
      _count: { stage: true },
    }),
    prisma.business.count({ where: { isAdminCreated: true, isMinorityOwned: true } }),
    prisma.business.count({ where: { isAdminCreated: true, isWomanOwned: true } }),
    prisma.business.count({ where: { isAdminCreated: true, isVeteranOwned: true } }),
    prisma.business.count({ where: { isAdminCreated: true, isDisabilityOwned: true } }),
    prisma.business.count({ where: { isAdminCreated: true, createdAt: { gte: cutoff90 } } }),
    prisma.handbookEntry.groupBy({ by: ["fieldId"], _count: { fieldId: true } }),
  ]);

  const stages: Record<string, number> = {};
  for (const row of stageBreakdown) {
    stages[row.stage] = row._count.stage;
  }

  // Governance participation — only counts proposals that actually closed for a
  // vote (no estimates). Aggregated across co-ops, not broken out by name.
  const votedProposals = await prisma.proposal.findMany({
    where: { entityType: "COOP", status: { in: ["CLOSED", "PASSED", "FAILED"] } },
    include: { votes: true },
  });
  const coopIdsWithVotes = [...new Set(votedProposals.map((p) => p.entityId))];
  const memberCounts = await prisma.coopMember.groupBy({
    by: ["coopId"],
    where: { coopId: { in: coopIdsWithVotes } },
    _count: { coopId: true },
  });
  const memberCountByCoop = Object.fromEntries(memberCounts.map((m) => [m.coopId, m._count.coopId]));

  let participationRateSum = 0;
  let proposalsWithMembers = 0;
  for (const p of votedProposals) {
    const memberCount = memberCountByCoop[p.entityId] ?? 0;
    if (memberCount === 0) continue;
    participationRateSum += p.votes.length / memberCount;
    proposalsWithMembers++;
  }
  const avgParticipationPct = proposalsWithMembers > 0
    ? Math.round((participationRateSum / proposalsWithMembers) * 100)
    : null;

  return NextResponse.json({
    entrepreneurs: {
      total: totalEntrepreneurs,
      addedLast90Days: recentBusinesses,
      byStage: stages,
      minorityOwned,
      womanOwned,
      veteranOwned,
      disabilityOwned,
    },
    coops: {
      total: activeCoops,
      activelyBuildingHandbook: coopsWithHandbook,
    },
    housing: {
      projects: housingProjects,
    },
    handbook: {
      fieldsFilled: handbookEntries.reduce((s, r) => s + r._count.fieldId, 0),
      uniqueFieldIds: handbookEntries.length,
    },
    governance: {
      proposalsVoted: votedProposals.length,
      coopsWithVoteData: coopIdsWithVotes.length,
      avgParticipationPct,
    },
  });
}

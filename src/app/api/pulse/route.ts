import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lansing, MI place-level Census geography (verified via Census Reporter geo
// search — NOT the same as a ZIP/ZCTA used by RegionPulse). Cached a week at
// the fetch level since citywide ACS estimates don't change often.
const LANSING_GEOID = "16000US2646000";

async function fetchLansingDemographics() {
  try {
    const url = `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B01001,B03002&geo_ids=${LANSING_GEOID}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json.data?.[LANSING_GEOID];
    if (!d) return null;

    const pop = d.B03002?.estimate?.B03002001 ?? 0;
    if (pop === 0) return null;
    const whiteNonHispanic = d.B03002?.estimate?.B03002003 ?? 0;
    const blackNonHispanic = d.B03002?.estimate?.B03002004 ?? 0;
    const asianNonHispanic = d.B03002?.estimate?.B03002006 ?? 0;
    const hispanicLatino = d.B03002?.estimate?.B03002012 ?? 0;

    const totalSex = d.B01001?.estimate?.B01001001 ?? 0;
    const male = d.B01001?.estimate?.B01001002 ?? 0;

    return {
      source: `${json.release?.name ?? "U.S. Census ACS"} — Lansing city, MI (Census Reporter)`,
      population: Math.round(pop),
      pctMinority: Math.round((1 - whiteNonHispanic / pop) * 1000) / 10,
      pctBlack: Math.round((blackNonHispanic / pop) * 1000) / 10,
      pctHispanic: Math.round((hispanicLatino / pop) * 1000) / 10,
      pctAsian: Math.round((asianNonHispanic / pop) * 1000) / 10,
      pctFemale: totalSex > 0 ? Math.round(((totalSex - male) / totalSex) * 1000) / 10 : null,
    };
  } catch {
    return null;
  }
}

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

  const lansingComparison = await fetchLansingDemographics();

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
    lansingComparison,
  });
}

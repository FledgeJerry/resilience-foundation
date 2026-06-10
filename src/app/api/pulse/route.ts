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
  });
}

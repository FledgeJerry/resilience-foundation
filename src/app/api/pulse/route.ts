import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public read-only endpoint — cross-site metrics for lansing.love governance dashboard
export async function GET() {
  const [
    totalEntrepreneurs,
    activeCoops,
    housingProjects,
    coopsWithHandbook,
    stageBreakdown,
    ownershipBreakdown,
    recentBusinesses,
  ] = await Promise.all([
    prisma.business.count({ where: { isAdminCreated: true } }),
    prisma.coop.count(),
    prisma.housingProject.count(),
    // Coops with at least one handbook entry = actively building
    prisma.coop.count({ where: { handbookEntries: { some: {} } } }),
    // Pipeline stage distribution
    prisma.business.groupBy({
      by: ["stage"],
      where: { isAdminCreated: true },
      _count: { stage: true },
    }),
    // Ownership demographics
    prisma.business.aggregate({
      where: { isAdminCreated: true },
      _sum: {
        isMinorityOwned: true as never,
        isWomanOwned: true as never,
        isVeteranOwned: true as never,
        isDisabilityOwned: true as never,
      },
    }),
    // Recent additions (last 90 days)
    prisma.business.count({
      where: {
        isAdminCreated: true,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // Handbook section completion — unique sections filled across all coops
  const handbookEntries = await prisma.handbookEntry.groupBy({
    by: ["fieldId"],
    _count: { fieldId: true },
  });

  const stages: Record<string, number> = {};
  for (const row of stageBreakdown) {
    stages[row.stage] = row._count.stage;
  }

  return NextResponse.json({
    entrepreneurs: {
      total: totalEntrepreneurs,
      addedLast90Days: recentBusinesses,
      byStage: stages,
      minorityOwned: Number((ownershipBreakdown._sum as Record<string, unknown>).isMinorityOwned ?? 0),
      womanOwned: Number((ownershipBreakdown._sum as Record<string, unknown>).isWomanOwned ?? 0),
      veteranOwned: Number((ownershipBreakdown._sum as Record<string, unknown>).isVeteranOwned ?? 0),
      disabilityOwned: Number((ownershipBreakdown._sum as Record<string, unknown>).isDisabilityOwned ?? 0),
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

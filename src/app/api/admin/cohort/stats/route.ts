import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businesses = await prisma.business.findMany({
    where: { isAdminCreated: true },
    select: {
      stage: true,
      industry: true,
      county: true,
      city: true,
      state: true,
      leapStatus: true,
      formationType: true,
      leapSubmittedAt: true,
      currentFte: true,
      plannedFte: true,
      annualRevenue: true,
      isMinorityOwned: true,
      isWomanOwned: true,
      isVeteranOwned: true,
    },
  });

  const total = businesses.length;

  // Demographics
  const minority = businesses.filter((b) => b.isMinorityOwned).length;
  const woman = businesses.filter((b) => b.isWomanOwned).length;
  const veteran = businesses.filter((b) => b.isVeteranOwned).length;
  const anyDemographic = businesses.filter((b) => b.isMinorityOwned || b.isWomanOwned || b.isVeteranOwned).length;

  // By stage
  const stageCounts = new Map<string, number>();
  for (const b of businesses) {
    stageCounts.set(b.stage, (stageCounts.get(b.stage) ?? 0) + 1);
  }
  const byStage = Array.from(stageCounts.entries()).map(([stage, count]) => ({ stage, count }));

  // By industry (top 15)
  const industryCounts = new Map<string, number>();
  for (const b of businesses) {
    const key = b.industry?.trim() || "Unknown";
    industryCounts.set(key, (industryCounts.get(key) ?? 0) + 1);
  }
  const byIndustry = Array.from(industryCounts.entries())
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // By county
  const countyCounts = new Map<string, number>();
  for (const b of businesses) {
    const key = b.county?.trim() || "Unknown";
    countyCounts.set(key, (countyCounts.get(key) ?? 0) + 1);
  }
  const byCounty = Array.from(countyCounts.entries())
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count);

  // By LEAP status
  const leapCounts = new Map<string, number>();
  for (const b of businesses) {
    const key = b.leapStatus?.trim() || "None";
    leapCounts.set(key, (leapCounts.get(key) ?? 0) + 1);
  }
  const byLeapStatus = Array.from(leapCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // By formation type
  const formCounts = new Map<string, number>();
  for (const b of businesses) {
    const key = b.formationType?.trim() || "Unknown";
    formCounts.set(key, (formCounts.get(key) ?? 0) + 1);
  }
  const byFormationType = Array.from(formCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // By quarter (using leapSubmittedAt)
  const quarterCounts = new Map<string, number>();
  for (const b of businesses) {
    if (!b.leapSubmittedAt) continue;
    const d = new Date(b.leapSubmittedAt);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const key = `${d.getFullYear()} Q${q}`;
    quarterCounts.set(key, (quarterCounts.get(key) ?? 0) + 1);
  }
  const byQuarter = Array.from(quarterCounts.entries())
    .map(([quarter, count]) => ({ quarter, count }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  // FTE
  const withCurrentFte = businesses.filter((b) => b.currentFte != null);
  const withPlannedFte = businesses.filter((b) => b.plannedFte != null);
  const totalCurrentFte = withCurrentFte.reduce((s, b) => s + (b.currentFte ?? 0), 0);
  const totalPlannedFte = withPlannedFte.reduce((s, b) => s + (b.plannedFte ?? 0), 0);

  // Revenue buckets
  const withRevenue = businesses.filter((b) => b.annualRevenue != null && b.annualRevenue > 0);
  const revenues = withRevenue.map((b) => b.annualRevenue as number).sort((a, b) => a - b);
  const avgRevenue = revenues.length ? revenues.reduce((s, n) => s + n, 0) / revenues.length : 0;
  const medianRevenue = revenues.length
    ? revenues[Math.floor(revenues.length / 2)]
    : 0;

  const revenueBuckets = [
    { label: "< $25K", min: 0, max: 25000 },
    { label: "$25K–$100K", min: 25000, max: 100000 },
    { label: "$100K–$500K", min: 100000, max: 500000 },
    { label: "$500K–$1M", min: 500000, max: 1000000 },
    { label: "$1M+", min: 1000000, max: Infinity },
  ].map(({ label, min, max }) => ({
    label,
    count: revenues.filter((r) => r >= min && r < max).length,
  }));

  return NextResponse.json({
    total,
    demographics: { minority, woman, veteran, anyDemographic },
    byStage,
    byIndustry,
    byCounty,
    byLeapStatus,
    byFormationType,
    byQuarter,
    fte: {
      totalCurrent: totalCurrentFte,
      totalPlanned: totalPlannedFte,
      withCurrentFte: withCurrentFte.length,
      withPlannedFte: withPlannedFte.length,
    },
    revenue: {
      withRevenue: withRevenue.length,
      avg: Math.round(avgRevenue),
      median: Math.round(medianRevenue),
      buckets: revenueBuckets,
    },
  });
}

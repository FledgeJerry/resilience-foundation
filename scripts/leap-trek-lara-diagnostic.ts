// Read-only diagnostic: reconciles the LARA-date count from
// leap-trek-export.ts (all businesses, laraDate within 1/1/24-9/30/26)
// against the admin dashboard's /api/admin/cohort/stats logic (only
// isAdminCreated businesses, laraDate non-null with no date bound), to
// explain a discrepancy Jerry spotted (39 vs. dashboard's 43). Writes
// nothing.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const WINDOW_START = new Date("2024-01-01T00:00:00Z");
const WINDOW_END = new Date("2026-09-30T23:59:59Z");

async function main() {
  const all = await prisma.business.findMany({ select: { id: true, name: true, laraDate: true, isAdminCreated: true } });

  const exportStyle = all.filter((b) => b.laraDate && b.laraDate >= WINDOW_START && b.laraDate <= WINDOW_END);
  const dashboardStyle = all.filter((b) => b.isAdminCreated && b.laraDate != null);
  const dashboardStyleInWindow = all.filter((b) => b.isAdminCreated && b.laraDate && b.laraDate >= WINDOW_START && b.laraDate <= WINDOW_END);

  console.log(`Total businesses: ${all.length}`);
  console.log(`Not isAdminCreated: ${all.filter((b) => !b.isAdminCreated).length}`);
  console.log();
  console.log(`[export style]    laraDate in 1/1/24-9/30/26, ALL businesses:            ${exportStyle.length}`);
  console.log(`[dashboard style] laraDate set (any date), isAdminCreated only:          ${dashboardStyle.length}`);
  console.log(`[dashboard+window] laraDate in 1/1/24-9/30/26, isAdminCreated only:      ${dashboardStyleInWindow.length}`);
  console.log();

  const exportIds = new Set(exportStyle.map((b) => b.id));
  const dashIds = new Set(dashboardStyle.map((b) => b.id));
  const onlyInDash = dashboardStyle.filter((b) => !exportIds.has(b.id));
  const onlyInExport = exportStyle.filter((b) => !dashIds.has(b.id));

  if (onlyInDash.length > 0) {
    console.log(`In dashboard count but NOT in export-window count (${onlyInDash.length}):`);
    for (const b of onlyInDash) console.log(`  ${b.id}  ${b.name}  laraDate=${b.laraDate?.toISOString().slice(0, 10)}  isAdminCreated=${b.isAdminCreated}`);
  }
  if (onlyInExport.length > 0) {
    console.log(`\nIn export-window count but NOT in dashboard count (${onlyInExport.length}):`);
    for (const b of onlyInExport) console.log(`  ${b.id}  ${b.name}  laraDate=${b.laraDate?.toISOString().slice(0, 10)}  isAdminCreated=${b.isAdminCreated}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

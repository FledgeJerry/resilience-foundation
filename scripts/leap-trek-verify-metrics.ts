// Independent second computation of the 8 LEAP TREK form metrics, using raw
// SQL rather than reusing scripts/leap-trek-export.ts's own JS loop logic —
// the point is to catch a bug in that script's logic, which re-running the
// same code can't do. Compares against a freshly generated
// leap-trek-export/metrics_summary.csv and reports any difference.
//
// Run AFTER scripts/leap-trek-export.ts has just been re-run post-cleanup:
//   npx tsx scripts/leap-trek-verify-metrics.ts
import "dotenv/config";
import { readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";

function parseMetricsCsv(path: string): Map<string, string> {
  const lines = readFileSync(path, "utf8").trim().split("\n").slice(1);
  const map = new Map<string, string>();
  for (const line of lines) {
    const [field, value] = line.split(",");
    map.set(field.replace(/^"|"$/g, ""), value);
  }
  return map;
}

async function main() {
  const csv = parseMetricsCsv("leap-trek-export/metrics_summary.csv");

  const [earlyStage] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Business"
    WHERE "formationDate" IS NOT NULL AND "leapSubmittedAt" IS NOT NULL
      AND EXTRACT(EPOCH FROM ("leapSubmittedAt" - "formationDate")) / (86400 * 365.25) BETWEEN 0 AND 3
  `;
  const [micro] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Business" WHERE "currentFte" BETWEEN 0 AND 10
  `;
  const [secondStage] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Business" WHERE "currentFte" > 10 AND "annualRevenue" > 1000000
  `;
  const [newStart] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Business"
    WHERE ("laraId" IS NOT NULL OR "laraDate" IS NOT NULL)
      AND "leapSubmittedAt" IS NOT NULL
      AND COALESCE("laraDate", "formationDate") IS NOT NULL
      AND COALESCE("laraDate", "formationDate") >= "leapSubmittedAt"
  `;
  const [projectedFte] = await prisma.$queryRaw<{ sum: number | null }[]>`
    SELECT SUM("plannedFte")::float AS sum FROM "Business"
  `;
  const [funding] = await prisma.$queryRaw<{ sum: number | null }[]>`
    SELECT SUM(amount)::float AS sum FROM "BusinessFunding"
  `;
  const [minority] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Business" WHERE "isMinorityOwned" = true
  `;
  const [connections] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "BusinessConnection"
  `;
  const [totalBiz] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Business"
  `;

  const independent: [string, string][] = [
    ["Early-stage businesses served", earlyStage.count.toString()],
    ["Microbusinesses served", micro.count.toString()],
    ["Second-stage businesses served", secondStage.count.toString()],
    ["New business starts", newStart.count.toString()],
    ["Projected FTE jobs", (projectedFte.sum ?? 0).toFixed(2)],
    ["Follow-on funding raised", (funding.sum ?? 0).toFixed(2)],
    ["Minority-owned businesses", minority.count.toString()],
    ["Mentorship connections", connections.count.toString()],
    ["Total distinct businesses served", totalBiz.count.toString()],
  ];

  console.log("Metric".padEnd(35), "export script".padEnd(15), "independent SQL".padEnd(18), "match");
  let anyMismatch = false;
  for (const [field, indepValue] of independent) {
    const exportValue = csv.get(field) ?? "MISSING FROM CSV";
    const match = exportValue === indepValue;
    if (!match) anyMismatch = true;
    console.log(field.padEnd(35), exportValue.padEnd(15), indepValue.padEnd(18), match ? "✓" : "✗ MISMATCH");
  }

  if (anyMismatch) {
    console.error("\n✗ At least one metric differs between the export script and the independent SQL recompute. Do not trust the numbers until this is resolved.");
    process.exit(1);
  } else {
    console.log("\n✓ All 8 metrics + total match between the export script and an independently-written SQL recompute.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

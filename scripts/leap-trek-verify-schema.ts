// Read-only check: do the 6 LEAP TREK columns exist on TrekTimeLog, and do
// exactly 292 rows have isReconstructed = true and reconstructedOn =
// 2026-09-21 (the rows scripts/leap-trek-cleanup.ts inserted)? Makes no
// changes — just reports pass/fail so a human decides what, if anything,
// needs fixing.
//
// Run: npx tsx scripts/leap-trek-verify-schema.ts
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const EXPECTED_COLUMNS = ["isReconstructed", "reconstructedOn", "evidenceRef", "grantCharged", "grantChargedHours", "sourceOfRecord"];

async function main() {
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'TrekTimeLog' AND table_schema = 'public'
  `;
  const present = new Set(columns.map((c) => c.column_name));
  const missing = EXPECTED_COLUMNS.filter((c) => !present.has(c));

  console.log("Column check:");
  for (const c of EXPECTED_COLUMNS) console.log(`  ${present.has(c) ? "✓" : "✗ MISSING"}  ${c}`);

  if (missing.length > 0) {
    console.error(`\n✗ Missing columns: ${missing.join(", ")}. The migration did not fully apply — run "npx prisma migrate deploy && npx prisma generate" and re-check before doing anything else.`);
    process.exit(1);
  }
  console.log("\n✓ All 6 columns exist.\n");

  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "TrekTimeLog"
    WHERE "isReconstructed" = true AND "reconstructedOn" = '2026-09-21'
  `;
  const n = Number(count);
  console.log(`Rows with isReconstructed = true AND reconstructedOn = 2026-09-21: ${n}`);
  if (n !== 292) {
    console.error(`\n✗ Expected exactly 292, got ${n}. Investigate before trusting the export — do not re-insert or modify anything automatically.`);
    process.exit(1);
  }
  console.log("\n✓ Exactly 292 rows match, as expected from the 2026-09-21 cleanup insert.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

// Fixes a data-entry artifact: 17 TrekTimeLog rows have staffMember = "Jerry,"
// (trailing comma from the original spreadsheet import) instead of "Jerry".
// Per person_name_fix.csv (Jerry Norris, 2026-09-21). Changes staffMember
// only — nothing else on these rows.
//
// Same safety model as leap-trek-cleanup.ts: dry run by default (read-only),
// --apply takes a pg_dump backup then does the update + verification in one
// transaction. Any mismatch throws and rolls back everything.
//
// Run (dry run):
//   npx tsx scripts/leap-trek-fix-person-name.ts --input ./cleanup-input/person_name_fix.csv
// Apply:
//   npx tsx scripts/leap-trek-fix-person-name.ts --input ./cleanup-input/person_name_fix.csv --apply
import "dotenv/config";
import { createReadStream, mkdirSync, appendFileSync } from "fs";
import * as readline from "readline";
import { execFileSync } from "child_process";
import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
function argVal(flag: string, fallback: string): string {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}
const APPLY = args.includes("--apply");
const INPUT_PATH = argVal("--input", "./cleanup-input/person_name_fix.csv");
const ARCHIVE_DIR = "archive";
const RUN_LOG = "leap-trek-export/cleanup_run_log.md";
const RUN_DATE = new Date().toISOString().slice(0, 10);

const EXPECTED_ROWS = 17;
const EXPECTED_JERRY_AFTER = 1049;
const EXPECTED_JEREMY_AFTER = 35;
const EXPECTED_TOTAL_HOURS = 1947.25;

async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const rl = readline.createInterface({ input: createReadStream(filePath, "utf8"), crlfDelay: Infinity });
    let headers: string[] | null = null;
    let currentRow: string[] = [];
    let inQuote = false;
    let currentField = "";
    function pushField() { currentRow.push(currentField); currentField = ""; }
    function pushRow() {
      if (headers === null) headers = currentRow.map((h) => h.trim());
      else if (currentRow.some((c) => c !== "")) {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = currentRow[i] ?? ""; });
        rows.push(obj);
      }
      currentRow = [];
    }
    rl.on("line", (line) => {
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQuote && line[i + 1] === '"') { currentField += '"'; i++; } else inQuote = !inQuote; }
        else if (ch === "," && !inQuote) pushField();
        else currentField += ch;
      }
      if (inQuote) currentField += "\n"; else { pushField(); pushRow(); }
    });
    rl.on("close", () => { if (currentField || currentRow.length) { pushField(); pushRow(); } resolve(rows); });
    rl.on("error", reject);
  });
}

function fail(msg: string): never { throw new Error(`STOP — ${msg}`); }

async function main() {
  console.log(APPLY ? "*** APPLY MODE — this will write to the database ***" : "DRY RUN — no writes will be made");
  console.log(`Input: ${INPUT_PATH}\n`);

  const rows = await parseCSV(INPUT_PATH);
  if (rows.length !== EXPECTED_ROWS) fail(`person_name_fix.csv has ${rows.length} rows, expected ${EXPECTED_ROWS}.`);
  console.log(`✓ Input file has exactly ${EXPECTED_ROWS} rows.\n`);

  const ids = rows.map((r) => r.entry_id);
  const dbRows = await prisma.trekTimeLog.findMany({ where: { id: { in: ids } } });
  if (dbRows.length !== ids.length) {
    const found = new Set(dbRows.map((r) => r.id));
    fail(`Only found ${dbRows.length}/${ids.length} entry_ids in the database. Missing: ${ids.filter((id) => !found.has(id)).join(", ")}`);
  }
  const byId = new Map(dbRows.map((r) => [r.id, r]));
  for (const r of rows) {
    const dbRow = byId.get(r.entry_id)!;
    if (dbRow.staffMember !== r.old_person_name) {
      fail(`Entry ${r.entry_id} has staffMember "${dbRow.staffMember}", expected old value "${r.old_person_name}". Not touching it.`);
    }
    if (r.new_person_name !== "Jerry") fail(`Row ${r.entry_id} has new_person_name "${r.new_person_name}", expected "Jerry" — this script only knows how to apply that specific fix.`);
  }
  console.log(`✓ All ${ids.length} rows currently have staffMember exactly matching old_person_name from the file.\n`);

  const jerryBefore = await prisma.trekTimeLog.count({ where: { staffMember: "Jerry" } });
  const jeremyBefore = await prisma.trekTimeLog.count({ where: { staffMember: "Jeremy" } });
  const totalAgg = await prisma.trekTimeLog.aggregate({ _sum: { hours: true }, _count: true });
  console.log(`Current state: Jerry=${jerryBefore}, Jeremy=${jeremyBefore}, total rows=${totalAgg._count}, total hours=${totalAgg._sum.hours}`);
  if (jerryBefore + EXPECTED_ROWS !== EXPECTED_JERRY_AFTER) {
    fail(`Jerry is currently ${jerryBefore}; +${EXPECTED_ROWS} would be ${jerryBefore + EXPECTED_ROWS}, not the expected ${EXPECTED_JERRY_AFTER}. Stopping rather than adapting.`);
  }
  if (jeremyBefore !== EXPECTED_JEREMY_AFTER) fail(`Jeremy is currently ${jeremyBefore}, expected to already be ${EXPECTED_JEREMY_AFTER} (this fix doesn't touch Jeremy rows).`);
  if (Math.abs((totalAgg._sum.hours ?? 0) - EXPECTED_TOTAL_HOURS) > 0.001) fail(`Total hours are currently ${totalAgg._sum.hours}, expected ${EXPECTED_TOTAL_HOURS} (this fix doesn't change any hours).`);
  console.log(`✓ Pre-check: applying this will bring Jerry to exactly ${EXPECTED_JERRY_AFTER}, matching your expectation.\n`);

  if (!APPLY) {
    console.log("Dry run complete. All checks passed. Nothing was written.");
    console.log(`Would update ${ids.length} rows: staffMember "Jerry," -> "Jerry".`);
    console.log("Re-run with --apply once this looks right.");
    return;
  }

  mkdirSync(ARCHIVE_DIR, { recursive: true });
  console.log("Taking a pg_dump backup before making any changes...");
  const backupFile = `${ARCHIVE_DIR}/backup_person_name_fix_${RUN_DATE}_${Date.now()}.dump`;
  execFileSync("pg_dump", ["--format=custom", `--file=${backupFile}`, process.env.DATABASE_URL!], { stdio: "inherit" });
  console.log(`Backup written to ${backupFile}\n`);

  const result = await prisma.$transaction(async (tx) => {
    const recheck = await tx.trekTimeLog.findMany({ where: { id: { in: ids } } });
    if (recheck.some((r) => r.staffMember !== "Jerry,")) fail("A row's staffMember changed between validation and transaction start — aborting.");

    const updated = await tx.trekTimeLog.updateMany({ where: { id: { in: ids } }, data: { staffMember: "Jerry" } });
    if (updated.count !== EXPECTED_ROWS) fail(`Updated ${updated.count} rows, expected exactly ${EXPECTED_ROWS}.`);

    const jerryAfter = await tx.trekTimeLog.count({ where: { staffMember: "Jerry" } });
    const jeremyAfter = await tx.trekTimeLog.count({ where: { staffMember: "Jeremy" } });
    const totalAfter = await tx.trekTimeLog.aggregate({ _sum: { hours: true }, _count: true });

    if (jerryAfter !== EXPECTED_JERRY_AFTER) fail(`POST-CHECK: Jerry is ${jerryAfter}, expected ${EXPECTED_JERRY_AFTER}.`);
    if (jeremyAfter !== EXPECTED_JEREMY_AFTER) fail(`POST-CHECK: Jeremy is ${jeremyAfter}, expected ${EXPECTED_JEREMY_AFTER}.`);
    if (Math.abs((totalAfter._sum.hours ?? 0) - EXPECTED_TOTAL_HOURS) > 0.001) fail(`POST-CHECK: total hours are ${totalAfter._sum.hours}, expected ${EXPECTED_TOTAL_HOURS}.`);

    console.log(`✓ Updated ${updated.count} rows. Jerry=${jerryAfter}, Jeremy=${jeremyAfter}, total hours=${totalAfter._sum.hours}.`);
    return { updated: updated.count, jerryAfter, jeremyAfter, totalHours: totalAfter._sum.hours, totalRows: totalAfter._count, backupFile };
  });

  console.log("\n*** Transaction committed. ***\n");

  const logEntry = `\n## person_name fix — ${new Date().toISOString()}

- Backup: \`${result.backupFile}\`
- Rows updated: ${result.updated} (staffMember "Jerry," -> "Jerry")
- Jerry: ${result.jerryAfter}, Jeremy: ${result.jeremyAfter}
- Total TrekTimeLog: ${result.totalRows} rows, ${result.totalHours} hours (unchanged)
`;
  appendFileSync(RUN_LOG, logEntry);
  console.log(`Logged to ${RUN_LOG}`);
}

main()
  .catch((e) => { console.error("\n" + (e instanceof Error ? e.message : String(e))); process.exit(1); })
  .finally(() => prisma.$disconnect());

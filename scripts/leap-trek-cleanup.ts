// LEAP TREK close-out data cleanup — applies the approved changes in
// claude_code_instructions.md (Sept 21, 2026): fixes two business records,
// moves 2 funding events off a duplicate business onto its survivor,
// deletes the duplicate (after confirming nothing else references it),
// replaces 31 rough 2026 time entries with 292 properly reconstructed ones,
// and adds the new TrekTimeLog columns those entries need.
//
// SAFETY MODEL
// - Default mode is a DRY RUN: every check below runs as a read-only query
//   and the plan is printed, but nothing is written. Nothing is ever
//   written without --apply.
// - --apply takes a pg_dump backup first (recorded in cleanup_run_log.md),
//   then does every data change inside ONE Prisma transaction. Any failed
//   assertion inside that transaction throws, which rolls back everything
//   — there is no partial-apply state.
// - Per the instructions: "If anything below does not match what you find
//   in the database, stop and report instead of adapting." Every check in
//   this script is written to throw with a specific message on mismatch,
//   never to silently coerce or skip a bad record.
//
// Run (dry run, safe, no writes):
//   npx tsx scripts/leap-trek-cleanup.ts --input ./cleanup-input --config ./leap-trek-cleanup.config.json
// Run for real (after reviewing the dry-run output):
//   npx tsx scripts/leap-trek-cleanup.ts --input ./cleanup-input --config ./leap-trek-cleanup.config.json --apply
import "dotenv/config";
import { createReadStream, mkdirSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import * as readline from "readline";
import { execFileSync } from "child_process";
import * as path from "path";
import { prisma } from "../src/lib/prisma";

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function argVal(flag: string, fallback: string): string {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}
const APPLY = args.includes("--apply");
const INPUT_DIR = argVal("--input", "./cleanup-input");
const CONFIG_PATH = argVal("--config", "./leap-trek-cleanup.config.json");
const ARCHIVE_DIR = "archive";
const RUN_LOG = "leap-trek-export/cleanup_run_log.md";
const RUN_DATE = new Date().toISOString().slice(0, 10);

// ── Config ──────────────────────────────────────────────────────────────────
type Config = {
  duplicateBusinessId: string;
  duplicateBusinessExpectedName: string;
  survivorBusinessId: string;
  survivorExpectedFundingRowsAfter: number;
  businessUpdates: { businessId: string; field: string; oldValue: string; newValue: string; ownerEmailCheck?: string }[];
  fundingMoves: { fundingId: string; fromBusinessId: string; toBusinessId: string }[];
  expected: {
    pre2026RowsUnchanged: { rows: number; hours: number };
    old2026Entries: { rows: number; hours: number };
    new2026Entries: { rows: number; hours: number; byQuarter: Record<string, { rows: number; hours: number }>; byCategory: Record<string, number> };
    totalAfter: { rows: number; hours: number };
    businessCountDelta: number;
  };
};
const config: Config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

// ── CSV parsing (quote-aware) ────────────────────────────────────────────────
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
        headers.forEach((h, i) => { obj[h] = (currentRow[i] ?? "").trim(); });
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

function fail(msg: string): never {
  throw new Error(`STOP — ${msg}`);
}

function quarterOf(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(APPLY ? "*** APPLY MODE — this will write to the database ***" : "DRY RUN — no writes will be made");
  console.log(`Input dir: ${INPUT_DIR}\nConfig: ${CONFIG_PATH}\n`);

  const businessChanges = await parseCSV(path.join(INPUT_DIR, "business_changes.csv"));
  const fundingChanges = await parseCSV(path.join(INPUT_DIR, "funding_changes.csv"));
  const removeRows = await parseCSV(path.join(INPUT_DIR, "time_entries_remove.csv"));
  const addRows = await parseCSV(path.join(INPUT_DIR, "time_entries_add.csv"));

  // ── Validate the input files themselves against the config's expectations ──
  const removeIds = removeRows.map((r) => r.entry_id);
  const removeHours = removeRows.reduce((s, r) => s + parseFloat(r.hours), 0);
  if (removeRows.length !== config.expected.old2026Entries.rows) fail(`time_entries_remove.csv has ${removeRows.length} rows, expected ${config.expected.old2026Entries.rows}`);
  if (Math.abs(removeHours - config.expected.old2026Entries.hours) > 0.001) fail(`time_entries_remove.csv totals ${removeHours} hours, expected ${config.expected.old2026Entries.hours}`);

  const addHours = addRows.reduce((s, r) => s + parseFloat(r.hours), 0);
  if (addRows.length !== config.expected.new2026Entries.rows) fail(`time_entries_add.csv has ${addRows.length} rows, expected ${config.expected.new2026Entries.rows}`);
  if (Math.abs(addHours - config.expected.new2026Entries.hours) > 0.001) fail(`time_entries_add.csv totals ${addHours} hours, expected ${config.expected.new2026Entries.hours}`);

  const addByCategory = new Map<string, number>();
  for (const r of addRows) addByCategory.set(r.category, (addByCategory.get(r.category) ?? 0) + 1);
  for (const [cat, count] of Object.entries(config.expected.new2026Entries.byCategory)) {
    if (addByCategory.get(cat) !== count) fail(`time_entries_add.csv has ${addByCategory.get(cat) ?? 0} rows in category "${cat}", expected ${count}`);
  }

  console.log("✓ Input files match the expected row counts and hour totals in the config.\n");

  // ── Read-only checks against the database ───────────────────────────────
  const dbOld2026 = await prisma.trekTimeLog.findMany({ where: { date: { gte: new Date("2026-01-01T00:00:00Z") } } });
  const dbOld2026Ids = new Set(dbOld2026.map((r) => r.id));
  const dbOld2026Hours = dbOld2026.reduce((s, r) => s + r.hours, 0);

  if (dbOld2026.length !== config.expected.old2026Entries.rows) {
    fail(`Database has ${dbOld2026.length} TrekTimeLog rows with entry_date >= 2026-01-01, expected exactly ${config.expected.old2026Entries.rows}. Stopping — do not adapt.`);
  }
  if (Math.abs(dbOld2026Hours - config.expected.old2026Entries.hours) > 0.001) {
    fail(`Database's 2026 rows total ${dbOld2026Hours} hours, expected ${config.expected.old2026Entries.hours}.`);
  }
  const removeIdSet = new Set(removeIds);
  const dbOnlyIds = [...dbOld2026Ids].filter((id) => !removeIdSet.has(id));
  const fileOnlyIds = removeIds.filter((id) => !dbOld2026Ids.has(id));
  if (dbOnlyIds.length > 0) fail(`Database has 2026 TrekTimeLog rows NOT in time_entries_remove.csv: ${dbOnlyIds.join(", ")}`);
  if (fileOnlyIds.length > 0) fail(`time_entries_remove.csv lists entry_ids not found in the database: ${fileOnlyIds.join(", ")}`);
  console.log(`✓ The database's full 2026 TrekTimeLog set (${dbOld2026.length} rows, ${dbOld2026Hours.toFixed(2)} hours) exactly matches time_entries_remove.csv.\n`);

  const pre2026 = await prisma.trekTimeLog.aggregate({ where: { date: { lt: new Date("2026-01-01T00:00:00Z") } }, _count: true, _sum: { hours: true } });
  const pre2026Rows = pre2026._count;
  const pre2026Hours = pre2026._sum.hours ?? 0;
  if (pre2026Rows !== config.expected.pre2026RowsUnchanged.rows || Math.abs(pre2026Hours - config.expected.pre2026RowsUnchanged.hours) > 0.001) {
    fail(`Pre-2026 baseline is ${pre2026Rows} rows / ${pre2026Hours} hours, expected ${config.expected.pre2026RowsUnchanged.rows} / ${config.expected.pre2026RowsUnchanged.hours}.`);
  }
  console.log(`✓ Pre-2026 baseline matches: ${pre2026Rows} rows, ${pre2026Hours.toFixed(2)} hours.\n`);

  // Business updates — verify identity before touching anything.
  for (const u of config.businessUpdates) {
    const biz = await prisma.business.findUnique({ where: { id: u.businessId }, include: { members: { include: { user: true } } } });
    if (!biz) fail(`Business ${u.businessId} not found.`);
    if (u.field === "company_legal_name") {
      if (biz!.name !== u.oldValue) fail(`Business ${u.businessId}.name is "${biz!.name}", expected old value "${u.oldValue}".`);
    } else if (u.field === "owner_first_name") {
      const owner = biz!.members.find((m) => m.role === "OWNER")?.user;
      if (!owner) fail(`Business ${u.businessId} has no OWNER member — cannot apply owner_first_name change.`);
      const firstToken = (owner.name ?? "").trim().split(/\s+/)[0];
      if (firstToken !== u.oldValue) fail(`Business ${u.businessId}'s owner name is "${owner.name}" (first token "${firstToken}"), expected "${u.oldValue}".`);
      if (u.ownerEmailCheck && owner.email !== u.ownerEmailCheck) fail(`Business ${u.businessId}'s owner email is "${owner.email}", expected "${u.ownerEmailCheck}" per the change note.`);
    } else {
      fail(`Unrecognized business_changes.csv field "${u.field}" — this script doesn't know how to apply it. Stopping rather than guessing.`);
    }
  }
  console.log(`✓ Both business updates verified against current records.\n`);

  // Duplicate business identity + funding moves + reference check.
  const dupBiz = await prisma.business.findUnique({ where: { id: config.duplicateBusinessId } });
  if (!dupBiz) fail(`Duplicate business ${config.duplicateBusinessId} not found.`);
  if (dupBiz!.name !== config.duplicateBusinessExpectedName) fail(`Duplicate business name is "${dupBiz!.name}", expected "${config.duplicateBusinessExpectedName}".`);

  for (const f of config.fundingMoves) {
    const funding = await prisma.businessFunding.findUnique({ where: { id: f.fundingId } });
    if (!funding) fail(`Funding row ${f.fundingId} not found.`);
    if (funding!.businessId !== f.fromBusinessId) fail(`Funding ${f.fundingId}.businessId is "${funding!.businessId}", expected "${f.fromBusinessId}".`);
  }
  console.log(`✓ Both funding rows to move exist and currently belong to the duplicate business.\n`);

  const survivorFundingBefore = await prisma.businessFunding.count({ where: { businessId: config.survivorBusinessId } });
  const expectedSurvivorBefore = config.survivorExpectedFundingRowsAfter - config.fundingMoves.length;
  if (survivorFundingBefore !== expectedSurvivorBefore) {
    fail(`Survivor business ${config.survivorBusinessId} currently has ${survivorFundingBefore} funding rows, expected ${expectedSurvivorBefore} before the move (so it reaches ${config.survivorExpectedFundingRowsAfter} after).`);
  }

  // Reference check across every activity relation on Business, for the
  // duplicate. BusinessMember (ownership) is deliberately excluded from the
  // must-be-zero check: every business has one, and it's configured
  // onDelete: Cascade in the schema, so it's expected to exist and will be
  // removed automatically along with the business — it's not "another row
  // still referencing it" in the sense the instructions mean. Every other
  // table here is Cascade too EXCEPT TrekTimeLog, which is SetNull — so a
  // remaining time log would silently survive with businessId=null rather
  // than blocking the delete if we didn't check it explicitly.
  const dupId = config.duplicateBusinessId;
  const memberCount = await prisma.businessMember.count({ where: { businessId: dupId } });
  const refs = {
    contacts: await prisma.contact.count({ where: { businessId: dupId } }),
    transactions: await prisma.businessTransaction.count({ where: { businessId: dupId } }),
    deals: await prisma.deal.count({ where: { businessId: dupId } }),
    planEntries: await prisma.businessPlanEntry.count({ where: { businessId: dupId } }),
    connections: await prisma.businessConnection.count({ where: { businessId: dupId } }),
    hires: await prisma.businessHire.count({ where: { businessId: dupId } }),
    timeLogs: await prisma.trekTimeLog.count({ where: { businessId: dupId } }),
    fundingRemaining: (await prisma.businessFunding.count({ where: { businessId: dupId } })) - config.fundingMoves.length,
  };
  const nonZero = Object.entries(refs).filter(([, v]) => v !== 0);
  if (nonZero.length > 0) {
    fail(`Duplicate business ${dupId} still has references after the planned funding move: ${JSON.stringify(Object.fromEntries(nonZero))}. Not deleting — investigate first.`);
  }
  console.log(`✓ No other activity rows reference the duplicate business (checked contacts, transactions, deals, planEntries, connections, hires, timeLogs, remaining funding). It has ${memberCount} BusinessMember row(s), which cascade-deletes with it.\n`);

  // New rows' business_ids must all exist.
  const addBizIds = [...new Set(addRows.map((r) => r.business_id).filter(Boolean))];
  const existingBiz = await prisma.business.findMany({ where: { id: { in: addBizIds } }, select: { id: true } });
  const existingBizSet = new Set(existingBiz.map((b) => b.id));
  const missingBiz = addBizIds.filter((id) => !existingBizSet.has(id));
  if (missingBiz.length > 0) fail(`time_entries_add.csv references business_ids that don't exist: ${missingBiz.join(", ")}`);
  console.log(`✓ All ${addBizIds.length} distinct business_ids referenced by the new time entries exist.\n`);

  const businessCountBefore = await prisma.business.count();

  // ── Dry run stops here ──────────────────────────────────────────────────
  if (!APPLY) {
    console.log("Dry run complete. All checks passed. Nothing was written.");
    console.log("Plan:");
    console.log(`  - Update ${config.businessUpdates.length} business records`);
    console.log(`  - Move ${config.fundingMoves.length} funding rows onto ${config.survivorBusinessId}`);
    console.log(`  - Delete business ${config.duplicateBusinessId} ("${config.duplicateBusinessExpectedName}")`);
    console.log(`  - Delete ${removeRows.length} old 2026 time entries (${removeHours.toFixed(2)} hours)`);
    console.log(`  - Insert ${addRows.length} new time entries (${addHours.toFixed(2)} hours)`);
    console.log(`  - Business count: ${businessCountBefore} -> ${businessCountBefore + config.expected.businessCountDelta}`);
    console.log("\nRe-run with --apply once this all looks right.");
    return;
  }

  // ── APPLY ─────────────────────────────────────────────────────────────────
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  mkdirSync("leap-trek-export", { recursive: true });

  console.log("\nTaking a pg_dump backup before making any changes...");
  const backupFile = `${ARCHIVE_DIR}/backup_${RUN_DATE}_${Date.now()}.dump`;
  const dbUrl = process.env.DATABASE_URL!;
  execFileSync("pg_dump", ["--format=custom", `--file=${backupFile}`, dbUrl], { stdio: "inherit" });
  console.log(`Backup written to ${backupFile}\n`);

  const result = await prisma.$transaction(async (tx) => {
    // Archive before touching anything.
    const archiveTimeRows = await tx.trekTimeLog.findMany({ where: { id: { in: removeIds } } });
    if (archiveTimeRows.length !== removeIds.length) fail("Row count changed between validation and transaction start (time entries) — aborting.");
    writeFileSync(
      `${ARCHIVE_DIR}/time_entries_removed_${RUN_DATE}.csv`,
      [Object.keys(archiveTimeRows[0]).join(","), ...archiveTimeRows.map((r) => Object.values(r).map((v) => (v instanceof Date ? v.toISOString() : String(v ?? ""))).join(","))].join("\n")
    );

    const archiveBiz = await tx.business.findUnique({ where: { id: dupId } });
    const archiveFunding = await tx.businessFunding.findMany({ where: { id: { in: config.fundingMoves.map((f) => f.fundingId) } } });
    const archiveMembers = await tx.businessMember.findMany({ where: { businessId: dupId }, include: { user: true } });
    if (!archiveBiz || archiveFunding.length !== config.fundingMoves.length) fail("Duplicate business or its funding rows changed between validation and transaction start — aborting.");
    writeFileSync(`${ARCHIVE_DIR}/business_${dupId}_${RUN_DATE}.json`, JSON.stringify({ business: archiveBiz, funding: archiveFunding, members: archiveMembers }, null, 2));
    console.log("✓ Archived the 31 time entries and the duplicate business + its funding + membership.");

    // a. Business updates.
    for (const u of config.businessUpdates) {
      if (u.field === "company_legal_name") {
        await tx.business.update({ where: { id: u.businessId }, data: { name: u.newValue } });
      } else if (u.field === "owner_first_name") {
        const biz = await tx.business.findUnique({ where: { id: u.businessId }, include: { members: { include: { user: true } } } });
        const owner = biz!.members.find((m) => m.role === "OWNER")!.user;
        const rest = (owner.name ?? "").trim().split(/\s+/).slice(1).join(" ");
        const newFullName = rest ? `${u.newValue} ${rest}` : u.newValue;
        await tx.user.update({ where: { id: owner.id }, data: { name: newFullName } });
      }
    }
    console.log("✓ Applied 2 business updates.");

    // b. Move funding.
    for (const f of config.fundingMoves) {
      await tx.businessFunding.update({ where: { id: f.fundingId }, data: { businessId: f.toBusinessId } });
    }
    const survivorFundingAfterMove = await tx.businessFunding.count({ where: { businessId: config.survivorBusinessId } });
    if (survivorFundingAfterMove !== config.survivorExpectedFundingRowsAfter) {
      fail(`After moving funding, survivor has ${survivorFundingAfterMove} funding rows, expected ${config.survivorExpectedFundingRowsAfter}.`);
    }
    console.log(`✓ Moved 2 funding rows. Survivor now has ${survivorFundingAfterMove} funding rows.`);

    // c. Delete duplicate business (re-check zero references post-move, inside the transaction).
    const refsNow = {
      contacts: await tx.contact.count({ where: { businessId: dupId } }),
      transactions: await tx.businessTransaction.count({ where: { businessId: dupId } }),
      deals: await tx.deal.count({ where: { businessId: dupId } }),
      planEntries: await tx.businessPlanEntry.count({ where: { businessId: dupId } }),
      connections: await tx.businessConnection.count({ where: { businessId: dupId } }),
      hires: await tx.businessHire.count({ where: { businessId: dupId } }),
      timeLogs: await tx.trekTimeLog.count({ where: { businessId: dupId } }),
      funding: await tx.businessFunding.count({ where: { businessId: dupId } }),
    };
    const stillReferenced = Object.entries(refsNow).filter(([, v]) => v !== 0);
    if (stillReferenced.length > 0) fail(`Duplicate business still referenced right before delete: ${JSON.stringify(Object.fromEntries(stillReferenced))}`);
    await tx.business.delete({ where: { id: dupId } });
    console.log(`✓ Deleted duplicate business ${dupId}.`);

    // d. Remove old 2026 entries (exact set already verified above).
    const del = await tx.trekTimeLog.deleteMany({ where: { id: { in: removeIds } } });
    if (del.count !== removeIds.length) fail(`Deleted ${del.count} time entries, expected ${removeIds.length}.`);
    console.log(`✓ Deleted ${del.count} old time entries.`);

    // e. Insert new entries. DB generates id; createdAt defaults to now().
    for (const r of addRows) {
      await tx.trekTimeLog.create({
        data: {
          date: new Date(r.entry_date),
          staffMember: r.person_name,
          hours: parseFloat(r.hours),
          category: r.category,
          notes: r.activity_description || null,
          businessId: r.business_id || null,
          isReconstructed: r.is_reconstructed?.toLowerCase() === "true" ? true : r.is_reconstructed?.toLowerCase() === "false" ? false : null,
          reconstructedOn: r.reconstructed_on ? new Date(r.reconstructed_on) : null,
          grantCharged: r.grant_charged?.toLowerCase() === "true" ? true : r.grant_charged?.toLowerCase() === "false" ? false : null,
          grantChargedHours: r.grant_charged_hours ? parseFloat(r.grant_charged_hours) : null,
          sourceOfRecord: r.source_of_record || null,
          evidenceRef: r.evidence_ref || null,
        },
      });
    }
    console.log(`✓ Inserted ${addRows.length} new time entries.`);

    // ── Step 4 verification, inside the transaction ────────────────────────
    const pre2026After = await tx.trekTimeLog.aggregate({ where: { date: { lt: new Date("2026-01-01T00:00:00Z") } }, _count: true, _sum: { hours: true } });
    if (pre2026After._count !== config.expected.pre2026RowsUnchanged.rows || Math.abs((pre2026After._sum.hours ?? 0) - config.expected.pre2026RowsUnchanged.hours) > 0.001) {
      fail(`POST-CHECK: pre-2026 rows changed! Now ${pre2026After._count} / ${pre2026After._sum.hours}, expected unchanged ${config.expected.pre2026RowsUnchanged.rows} / ${config.expected.pre2026RowsUnchanged.hours}.`);
    }

    const new2026 = await tx.trekTimeLog.findMany({ where: { date: { gte: new Date("2026-01-01T00:00:00Z") } } });
    const new2026Hours = new2026.reduce((s, r) => s + r.hours, 0);
    if (new2026.length !== config.expected.new2026Entries.rows || Math.abs(new2026Hours - config.expected.new2026Entries.hours) > 0.001) {
      fail(`POST-CHECK: new 2026 rows are ${new2026.length} / ${new2026Hours}, expected ${config.expected.new2026Entries.rows} / ${config.expected.new2026Entries.hours}.`);
    }
    const byQ = new Map<string, { rows: number; hours: number }>();
    for (const r of new2026) {
      const q = quarterOf(r.date);
      const cur = byQ.get(q) ?? { rows: 0, hours: 0 };
      cur.rows++; cur.hours += r.hours;
      byQ.set(q, cur);
    }
    for (const [q, exp] of Object.entries(config.expected.new2026Entries.byQuarter)) {
      const actual = byQ.get(q) ?? { rows: 0, hours: 0 };
      if (actual.rows !== exp.rows || Math.abs(actual.hours - exp.hours) > 0.001) {
        fail(`POST-CHECK: quarter ${q} is ${actual.rows} rows / ${actual.hours} hours, expected ${exp.rows} / ${exp.hours}.`);
      }
    }
    const byCat = new Map<string, number>();
    for (const r of new2026) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
    for (const [cat, exp] of Object.entries(config.expected.new2026Entries.byCategory)) {
      if ((byCat.get(cat) ?? 0) !== exp) fail(`POST-CHECK: category "${cat}" has ${byCat.get(cat) ?? 0} rows, expected ${exp}.`);
    }
    const oneOnOneWithBiz = new2026.filter((r) => r.category === "One on One Consulting" && r.businessId).length;
    const oneOnOneTotal = new2026.filter((r) => r.category === "One on One Consulting").length;
    if (oneOnOneWithBiz !== oneOnOneTotal) fail(`POST-CHECK: ${oneOnOneTotal - oneOnOneWithBiz} "One on One Consulting" rows are missing a business_id.`);

    const totalAfter = await tx.trekTimeLog.aggregate({ _count: true, _sum: { hours: true } });
    if (totalAfter._count !== config.expected.totalAfter.rows || Math.abs((totalAfter._sum.hours ?? 0) - config.expected.totalAfter.hours) > 0.001) {
      fail(`POST-CHECK: total TrekTimeLog is ${totalAfter._count} rows / ${totalAfter._sum.hours} hours, expected ${config.expected.totalAfter.rows} / ${config.expected.totalAfter.hours}.`);
    }

    const businessCountAfter = await tx.business.count();
    if (businessCountAfter - businessCountBefore !== config.expected.businessCountDelta) {
      fail(`POST-CHECK: business count changed by ${businessCountAfter - businessCountBefore}, expected ${config.expected.businessCountDelta}.`);
    }

    const survivorFundingFinal = await tx.businessFunding.count({ where: { businessId: config.survivorBusinessId } });
    if (survivorFundingFinal !== config.survivorExpectedFundingRowsAfter) fail(`POST-CHECK: survivor funding count is ${survivorFundingFinal}, expected ${config.survivorExpectedFundingRowsAfter}.`);

    const dupStillExists = await tx.business.findUnique({ where: { id: dupId } });
    if (dupStillExists) fail("POST-CHECK: duplicate business still exists after delete.");

    console.log("✓ All Step 4 post-commit checks passed.");
    return { businessCountBefore, businessCountAfter, pre2026: pre2026After, new2026: { count: new2026.length, hours: new2026Hours }, totalAfter, survivorFundingFinal, backupFile };
  });

  console.log("\n*** Transaction committed. ***\n");

  const logEntry = `\n## Cleanup run — ${new Date().toISOString()}

- Backup: \`${result.backupFile}\`
- Businesses: ${result.businessCountBefore} -> ${result.businessCountAfter}
- Pre-2026 TrekTimeLog (unchanged): ${result.pre2026._count} rows, ${result.pre2026._sum.hours} hours
- New 2026 TrekTimeLog: ${result.new2026.count} rows, ${result.new2026.hours.toFixed(2)} hours
- Total TrekTimeLog: ${result.totalAfter._count} rows, ${result.totalAfter._sum.hours} hours
- Survivor (${config.survivorBusinessId}) funding rows: ${result.survivorFundingFinal}
- Duplicate business ${dupId}: deleted, archived to \`${ARCHIVE_DIR}/business_${dupId}_${RUN_DATE}.json\`
- Removed time entries: archived to \`${ARCHIVE_DIR}/time_entries_removed_${RUN_DATE}.csv\`
`;
  appendFileSync(RUN_LOG, logEntry);
  console.log(`Logged to ${RUN_LOG}`);
}

main()
  .catch((e) => { console.error("\n" + (e instanceof Error ? e.message : String(e))); process.exit(1); })
  .finally(() => prisma.$disconnect());

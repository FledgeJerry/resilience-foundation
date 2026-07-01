/**
 * Import TREK time tracking from 2024 and 2025 CSVs.
 *
 * - 1:1 sessions with named entrepreneurs → TrekTimeLog with businessId
 * - Group / admin rows (EJ Meetup, 99 Problems, Admin, etc.) → TrekTimeLog with businessId=null
 * - Multi-entrepreneur rows ("Sean, Shaq") → one entry per entrepreneur
 * - Name matching: exact full name first, then first-name lookup
 * - Dedup: skip if same date + category + hours + staffMember + businessId already exists
 *
 * Run: npx tsx scripts/import-time-tracking.ts [2024.csv] [2025.csv]
 */

import { createReadStream } from "fs";
import * as readline from "readline";
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: path.join(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DOWNLOADS = path.join(process.env.HOME!, "Downloads");

type CsvRow = { [key: string]: string };

async function parseCSV(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    const rl = readline.createInterface({ input: createReadStream(filePath, "utf8"), crlfDelay: Infinity });
    let headers: string[] | null = null;
    let currentRow: string[] = [];
    let inQuote = false;
    let currentField = "";

    function pushField() { currentRow.push(currentField.trim()); currentField = ""; }
    function pushRow() {
      if (headers === null) {
        if (currentRow[0]?.trim() === "Date") {
          headers = currentRow.map(h => h.trim());
        }
      } else if (currentRow.some(c => c)) {
        const obj: CsvRow = {};
        headers.forEach((h, i) => { obj[h] = currentRow[i] ?? ""; });
        rows.push(obj);
      }
      currentRow = [];
    }

    rl.on("line", line => {
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { currentField += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === "," && !inQuote) { pushField(); }
        else { currentField += ch; }
      }
      if (inQuote) { currentField += "\n"; }
      else { pushField(); pushRow(); }
    });
    rl.on("close", () => { if (currentField || currentRow.length) { pushField(); pushRow(); } resolve(rows); });
    rl.on("error", reject);
  });
}

function clean(s: string | undefined): string {
  return (s ?? "").trim();
}


function parseDate(s: string): Date | null {
  if (!s.trim()) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const GROUP_KEYWORDS = /^(assorted|admin|misc|trek meeting|siso,jerry)$/i;
const GROUP_CATEGORIES = /^(ej meetup|ej meet-up|entrepreneurial journey|99 problems|data\/reporting|admin and reporting|reporting|trek meeting|admin)$/i;

async function main() {
  const file2024 = process.argv[2] ?? path.join(DOWNLOADS, "TREK Reporting_Master.xlsx - 2024 Time.csv");
  const file2025 = process.argv[3] ?? path.join(DOWNLOADS, "TREK Reporting_Master.xlsx - 2025 Time.csv");

  console.log(`2024 file: ${file2024}`);
  console.log(`2025 file: ${file2025}\n`);

  const [rows2024, rows2025] = await Promise.all([parseCSV(file2024), parseCSV(file2025)]);
  const allRows = [...rows2024, ...rows2025].filter(r => r["Date"]?.trim());
  console.log(`Loaded ${rows2024.length} (2024) + ${rows2025.length} (2025) = ${allRows.length} rows\n`);

  // Build name → businessId lookup
  const businesses = await prisma.business.findMany({
    where: { isAdminCreated: true },
    include: { members: { where: { role: "OWNER" }, include: { user: true }, take: 1 } },
  });

  const byFullName = new Map<string, string>(); // "Sean French" → businessId
  const byFirstName = new Map<string, string>(); // "Sean" → businessId (last wins if ambiguous)

  for (const biz of businesses) {
    const owner = biz.members[0]?.user;
    if (!owner?.name) continue;
    const full = owner.name.trim();
    byFullName.set(full.toLowerCase(), biz.id);
    const first = full.split(" ")[0];
    byFirstName.set(first.toLowerCase(), biz.id);
    // Also index by business name first word (for cases like "Cassin Coleman" = Cassin Consulting)
  }

  // Also check the business name itself as a fallback key
  const byBizName = new Map<string, string>();
  for (const biz of businesses) {
    byBizName.set(biz.name.toLowerCase(), biz.id);
  }

  function resolveEntrepreneur(name: string): string | null {
    const n = name.trim().toLowerCase();
    if (!n || GROUP_KEYWORDS.test(n)) return null;
    return byFullName.get(n) ?? byFirstName.get(n) ?? null;
  }

  let created = 0, skipped = 0, unmatched = 0;

  for (const row of allRows) {
    const dateStr = clean(row["Date"]);
    const date = parseDate(dateStr);
    if (!date) continue;

    const category = clean(row["Category"]);
    const entrepreneur = clean(row["Entrepreneur"]);
    const who = clean(row["Who"]);
    // Normalize staff name: "Jerry Norris" → "Jerry", "Jeremy Hurt" → "Jeremy"
    const staffMember = who.split(" ")[0] || who;
    const hoursStr = clean(row["Time in Hours"]);
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) continue;
    const notes = clean(row["Comments"]) || null;

    // Determine if this is a group/admin row
    const isGroup = !entrepreneur || GROUP_KEYWORDS.test(entrepreneur) || GROUP_CATEGORIES.test(category);

    if (isGroup) {
      // Program-level entry (businessId = null)
      const existing = await prisma.trekTimeLog.findFirst({
        where: { businessId: null, date, category, hours, staffMember },
      });
      if (existing) { skipped++; continue; }
      await prisma.trekTimeLog.create({
        data: { businessId: null, date, category, hours, staffMember, notes },
      });
      created++;
    } else {
      // Named entrepreneur(s) — split on comma for multi-person rows
      const names = entrepreneur.split(/,\s*/).map(n => n.trim()).filter(Boolean);
      for (const name of names) {
        const businessId = resolveEntrepreneur(name);
        if (!businessId) {
          console.log(`  ? unmatched  "${name}" (${dateStr})`);
          unmatched++;
          // Still create the entry with businessId=null but note the name
          const existing = await prisma.trekTimeLog.findFirst({
            where: { businessId: null, date, category, hours: hours / names.length, staffMember, notes: `${name} (unmatched)` },
          });
          if (!existing) {
            await prisma.trekTimeLog.create({
              data: { businessId: null, date, category, hours: hours / names.length, staffMember, notes: `${name} (unmatched)` },
            });
            created++;
          } else skipped++;
          continue;
        }
        const entryHours = hours / names.length;
        const existing = await prisma.trekTimeLog.findFirst({
          where: { businessId, date, category, hours: entryHours, staffMember },
        });
        if (existing) { skipped++; continue; }
        await prisma.trekTimeLog.create({
          data: { businessId, date, category, hours: entryHours, staffMember, notes },
        });
        created++;
      }
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (exact dup), ${unmatched} unmatched entrepreneurs`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

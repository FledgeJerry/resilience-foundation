/**
 * Import entrepreneur cohort from two HubSpot CRM export CSVs.
 *
 * Files (default: ~/Downloads):
 *   Companies: hubspot-crm-exports-trek-2026-05-22.csv
 *   Contacts:  hubspot-crm-exports-trek-2026-05-22-1.csv
 *
 * Join: Contacts."Associated Company IDs" ↔ Companies."Record ID"
 * Primary key: entrepreneur email
 * Safe to re-run — skips existing emails (idempotent).
 *
 * Run: npx tsx scripts/import-hubspot.ts
 * Custom paths: npx tsx scripts/import-hubspot.ts <companies.csv> <contacts.csv>
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

// ── CSV parser (handles quoted fields + embedded newlines) ────────────────────

async function parseCSV(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    const rl = readline.createInterface({ input: createReadStream(filePath, "utf8"), crlfDelay: Infinity });
    let headers: string[] | null = null;
    let currentRow: string[] = [];
    let inQuote = false;
    let currentField = "";

    function pushField() {
      currentRow.push(currentField.trim());
      currentField = "";
    }

    function pushRow() {
      if (headers === null) {
        headers = currentRow.map((h) => h.replace(/^﻿/, "").trim());
      } else if (currentRow.some((c) => c)) {
        const obj: CsvRow = {};
        headers.forEach((h, i) => { obj[h] = currentRow[i] ?? ""; });
        rows.push(obj);
      }
      currentRow = [];
    }

    rl.on("line", (line) => {
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { currentField += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === "," && !inQuote) {
          pushField();
        } else {
          currentField += ch;
        }
      }
      if (inQuote) {
        currentField += "\n";
      } else {
        pushField();
        pushRow();
      }
    });

    rl.on("close", () => {
      if (currentField || currentRow.length) { pushField(); pushRow(); }
      resolve(rows);
    });
    rl.on("error", reject);
  });
}

// ── Data cleaning helpers ─────────────────────────────────────────────────────

function cleanStr(s: string | undefined): string {
  if (!s) return "";
  // Strip UTF-8 encoding artifacts (Â, non-breaking spaces, etc.)
  return s.replace(/Â\s*/g, "").replace(/ /g, " ").trim();
}

const LARA_JUNK = /not\s*(found|registered|avail|yet)|none|n\/a|na\b|nl\b|being|in\s*progress|dissolved|removing|currently/i;

function cleanLaraId(s: string | undefined): string | null {
  const v = cleanStr(s);
  if (!v || LARA_JUNK.test(v)) return null;
  // Valid LARA IDs are numeric (possibly prefixed with B/L)
  const m = v.match(/[BL]?\d{6,}/i);
  return m ? m[0].toUpperCase() : null;
}

function parseRevenue(s: string | undefined): number | null {
  if (!s || !s.trim() || s.trim() === "0") return null;
  const n = parseFloat(cleanStr(s).replace(/[$,]/g, ""));
  return isNaN(n) || n <= 0 ? null : n;
}

function parseFte(s: string | undefined): number | null {
  if (!s || !s.trim()) return null;
  const n = Math.round(parseFloat(cleanStr(s)));
  return isNaN(n) || n < 0 ? null : n;
}

function parseDate(s: string | undefined): Date | null {
  if (!s || !s.trim()) return null;
  const d = new Date(cleanStr(s));
  return isNaN(d.getTime()) ? null : d;
}

// ── Build the merged record map ───────────────────────────────────────────────

type EntrepreneurRecord = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  businessName: string;
  description: string;
  city: string;
  state: string;
  county: string;
  website: string;
  industry: string;
  formationType: string;
  naicsCode: string;
  laraId: string | null;
  laraDate: Date | null;
  currentFte: number | null;
  plannedFte: number | null;
  annualRevenue: number | null;
  isMinorityOwned: boolean;
  isWomanOwned: boolean;
  isVeteranOwned: boolean;
  leapStatus: string;
  leapSubmittedAt: Date | null;
};

function buildRecords(
  companies: CsvRow[],
  contacts: CsvRow[]
): Map<string, EntrepreneurRecord> {
  // Map contact Record ID → contact row
  const contactById = new Map<string, CsvRow>();
  for (const c of contacts) {
    const id = cleanStr(c["Record ID"]);
    if (id) contactById.set(id, c);
  }

  // Also map contact by company ID for reverse lookup
  // contacts["Associated Company IDs"] is the company's Record ID
  const contactsByCompanyId = new Map<string, CsvRow[]>();
  for (const c of contacts) {
    const compIds = cleanStr(c["Associated Company IDs"]).split(";").map((s) => s.trim()).filter(Boolean);
    for (const cid of compIds) {
      if (!contactsByCompanyId.has(cid)) contactsByCompanyId.set(cid, []);
      contactsByCompanyId.get(cid)!.push(c);
    }
  }

  const byEmail = new Map<string, EntrepreneurRecord>();

  for (const co of companies) {
    const companyId = cleanStr(co["Record ID"]);
    const companyName = cleanStr(co["Company name"]);
    if (!companyId && !companyName) continue;

    // Find the primary contact — prefer "Contact with Primary Company IDs" field,
    // fall back to any contact associated with this company
    let contact: CsvRow | undefined;

    const primaryIds = cleanStr(co["Contact with Primary Company IDs"])
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const pid of primaryIds) {
      const c = contactById.get(pid);
      if (c && cleanStr(c["Email"]).includes("@")) { contact = c; break; }
    }

    if (!contact) {
      const assoc = contactsByCompanyId.get(companyId) ?? [];
      contact = assoc.find((c) => cleanStr(c["Email"]).includes("@"));
    }

    if (!contact) continue; // No usable contact for this company

    const email = cleanStr(contact["Email"]).toLowerCase();
    if (!email || !email.includes("@")) continue;

    // Skip duplicates (first company wins for a given email)
    if (byEmail.has(email)) continue;

    const firstName = cleanStr(contact["First Name"]);
    const lastName = cleanStr(contact["Last Name"]);
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const bipoc = cleanStr(contact["BIPOC"]).toLowerCase() === "yes";
    const gender = cleanStr(contact["Gender"]);
    const isWomanOwned = gender.toLowerCase() === "female";

    // Parse state from city field if it contains a comma
    let city = cleanStr(contact["City"]);
    let state = "";
    if (city.includes(",")) {
      const parts = city.split(",").map((s) => s.trim());
      city = parts[0];
      state = parts[1] ?? "";
    }

    byEmail.set(email, {
      name: fullName || email.split("@")[0],
      email,
      phone: cleanStr(contact["Phone Number"]),
      gender,
      businessName: companyName || `${fullName || email}'s Business`,
      description: cleanStr(co["Description"]),
      city,
      state,
      county: "",
      website: "",
      industry: "",
      formationType: "",
      naicsCode: "",
      laraId: cleanLaraId(co["LARA ID"]),
      laraDate: parseDate(co["LARA Date"]),
      currentFte: parseFte(co["Number of Employees"]),
      plannedFte: null,
      annualRevenue: parseRevenue(co["Annual Revenue"]) ?? parseRevenue(contact["Total Revenue"]),
      isMinorityOwned: bipoc,
      isWomanOwned,
      isVeteranOwned: false,
      leapStatus: "Connected",
      leapSubmittedAt: parseDate(co["Close Date"]) ?? parseDate(co["Create Date"]),
    });
  }

  return byEmail;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const companiesFile = args[0] ?? path.join(DOWNLOADS, "hubspot-crm-exports-trek-2026-05-22.csv");
  const contactsFile  = args[1] ?? path.join(DOWNLOADS, "hubspot-crm-exports-trek-2026-05-22-1.csv");

  console.log(`Companies: ${companiesFile}`);
  console.log(`Contacts:  ${contactsFile}`);

  const [companies, contacts] = await Promise.all([parseCSV(companiesFile), parseCSV(contactsFile)]);
  console.log(`Loaded ${companies.length} companies, ${contacts.length} contacts`);

  const merged = buildRecords(companies, contacts);
  console.log(`Matched ${merged.size} entrepreneur records\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const rec of Array.from(merged.values())) {
    try {
      // Skip if email already exists
      const existingUser = await prisma.user.findUnique({ where: { email: rec.email } });
      if (existingUser) {
        const existingBiz = await prisma.businessMember.findFirst({ where: { userId: existingUser.id } });
        if (existingBiz) {
          console.log(`  → skip  ${rec.email} (already imported)`);
          skipped++;
          continue;
        }
        // User exists but no business — fall through and create the business
      }

      const userId = existingUser
        ? existingUser.id
        : (await prisma.user.create({
            data: {
              name: rec.name,
              email: rec.email,
              phone: rec.phone || null,
              gender: rec.gender || null,
              city: rec.city || null,
              state: rec.state || null,
              isImported: true,
            },
          })).id;

      await prisma.business.create({
        data: {
          name: rec.businessName,
          description: rec.description || null,
          industry: rec.industry || null,
          city: rec.city || null,
          state: rec.state || null,
          county: rec.county || null,
          website: rec.website || null,
          phone: rec.phone || null,
          formationType: rec.formationType || null,
          naicsCode: rec.naicsCode || null,
          laraId: rec.laraId || null,
          laraDate: rec.laraDate,
          currentFte: rec.currentFte,
          plannedFte: rec.plannedFte,
          annualRevenue: rec.annualRevenue,
          isMinorityOwned: rec.isMinorityOwned,
          isWomanOwned: rec.isWomanOwned,
          isVeteranOwned: rec.isVeteranOwned,
          leapStatus: rec.leapStatus || null,
          leapSubmittedAt: rec.leapSubmittedAt,
          isAdminCreated: true,
          members: { create: { userId, role: "OWNER" } },
        },
      });

      console.log(`  ✓ create ${rec.email}  →  ${rec.businessName}`);
      created++;
    } catch (err) {
      console.error(`  ✗ error  ${rec.email}: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${errors} errors`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });

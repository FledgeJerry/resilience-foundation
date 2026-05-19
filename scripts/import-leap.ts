/**
 * Import LEAP entrepreneur cohort from three CSV sources into the platform.
 *
 * Sources (in ~/Downloads):
 *   1. October Site Visit Data - Fledge(LEAP Intake Form Data).csv  — 141 rows, primary list
 *   2. October Site Visit Data - Fledge(LEAP Survey Results - Fledge ).csv  — 67 rows, enrichment
 *   3. THEFLEDGE_Tri-County_Resource_for_Entrepr2025-05-19_23_34_22.csv  — 25 rows, enrichment
 *
 * For each unique email: creates a User (isImported=true, no password) and a Business
 * linked via BusinessMember. Safe to re-run — skips existing emails.
 *
 * Run: npx tsx scripts/import-leap.ts
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

// ── CSV parsing ───────────────────────────────────────────────────────────────

async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
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
        const obj: Record<string, string> = {};
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

// ── Data merging ──────────────────────────────────────────────────────────────

type EntrepreneurRecord = {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  city: string;
  state: string;
  county: string;
  website: string;
  industry: string;
  formationType: string;
  naicsCode: string;
  currentFte: number | null;
  plannedFte: number | null;
  annualRevenue: number | null;
  isMinorityOwned: boolean;
  isWomanOwned: boolean;
  isVeteranOwned: boolean;
  leapStatus: string;
  leapSubmittedAt: Date | null;
  description: string;
};

function parseRevenue(s: string): number | null {
  if (!s || s.trim() === "" || s.trim() === "0") return null;
  const n = parseFloat(s.replace(/[$,]/g, ""));
  return isNaN(n) ? null : n;
}

function parseFte(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function parseDate(s: string): Date | null {
  if (!s || !s.trim()) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function mergeRecords(
  intake: Record<string, string>[],
  survey: Record<string, string>[],
  appForm: Record<string, string>[]
): Map<string, EntrepreneurRecord> {
  const byEmail = new Map<string, EntrepreneurRecord>();

  // 1. Seed from intake form (company name + email + status)
  for (const r of intake) {
    const email = r["Email"]?.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    byEmail.set(email, {
      name: "",
      email,
      phone: "",
      businessName: r["Company name"]?.trim() ?? "",
      city: "", state: "", county: "",
      website: "", industry: "", formationType: "", naicsCode: "",
      currentFte: null, plannedFte: null, annualRevenue: null,
      isMinorityOwned: false, isWomanOwned: false, isVeteranOwned: false,
      leapStatus: r["Status"]?.trim() ?? "",
      leapSubmittedAt: null,
      description: "",
    });
  }

  // 2. Enrich from survey results
  for (const r of survey) {
    const email = r["Email"]?.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    const existing = byEmail.get(email) ?? {
      name: "", email, phone: "", businessName: "", city: "", state: "", county: "",
      website: "", industry: "", formationType: "", naicsCode: "",
      currentFte: null, plannedFte: null, annualRevenue: null,
      isMinorityOwned: false, isWomanOwned: false, isVeteranOwned: false,
      leapStatus: "", leapSubmittedAt: null, description: "",
    };

    const nameField = r["Name"]?.trim();
    const bizField = r["Business Name"]?.trim();
    const addrField = r["Business Address - Street Number and Name"]?.trim() ?? "";
    const cityStateField = r["Business Address - City and State"]?.trim() ?? "";
    const countyField = r["Which county is your business based in?"]?.trim() ?? "";
    const revenueField = r["What’s your business’s total revenue in the past 12 months? "]?.trim()
      ?? r["What's your business's total revenue in the past 12 months? "]?.trim() ?? "";
    const submittedField = r["Submission Date"]?.trim() ?? "";
    const sediField = r["Do you identify as one or more of the following: Minority Owned/Operated - Women Owned/Operated - Disabled Owned/Operated - Disabled Owned/Operated - LGBTQIA+ Owned/Operated - Low to Moderate Income Owned/Operated - Otherwise Identify as SEDI (Socially and Economically Disadvantaged Individual) Owned/Operated?"]?.trim() ?? "";

    if (nameField && !existing.name) existing.name = nameField;
    if (bizField && !existing.businessName) existing.businessName = bizField;
    if (countyField && !existing.county) existing.county = countyField;
    if (revenueField && !existing.annualRevenue) existing.annualRevenue = parseRevenue(revenueField);
    if (submittedField && !existing.leapSubmittedAt) existing.leapSubmittedAt = parseDate(submittedField);
    if (!existing.leapStatus && r["Is your business still operating?"]) {
      existing.leapStatus = r["Is your business still operating?"].trim() === "Yes" ? "Connected" : "";
    }
    if (sediField.toLowerCase() === "yes") existing.isMinorityOwned = true;

    // Try to parse city/state from combined field
    if (!existing.city && cityStateField) {
      const parts = cityStateField.split(",").map((s) => s.trim());
      existing.city = parts[0] ?? "";
      existing.state = parts[1] ?? "";
    }
    if (!existing.city && addrField) {
      const m = addrField.match(/,\s*([^,]+),\s*([A-Z]{2})/);
      if (m) { existing.city = m[1]; existing.state = m[2]; }
    }

    byEmail.set(email, existing);
  }

  // 3. Enrich from application form (most detailed)
  for (const r of appForm) {
    const email = r["Email Address"]?.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    const existing = byEmail.get(email) ?? {
      name: "", email, phone: "", businessName: "", city: "", state: "", county: "",
      website: "", industry: "", formationType: "", naicsCode: "",
      currentFte: null, plannedFte: null, annualRevenue: null,
      isMinorityOwned: false, isWomanOwned: false, isVeteranOwned: false,
      leapStatus: "", leapSubmittedAt: null, description: "",
    };

    const nameField = r["Name"]?.trim();
    const bizField = r["What is the legal name of your business?  (if available)"]?.trim();
    const phoneField = r["Phone Number"]?.trim();
    const cityField = r["Business Address (City)"]?.trim();
    const stateField = r["Business Address (State)"]?.trim();
    const countyField = r["Which County is Your Business Based In?"]?.trim();
    const websiteField = r["Website (if available)"]?.trim();
    const industryField = r["What will the primary industry/sector of the business be? Please select the primary category from the items below."]?.trim();
    const formationField = r["What type of Business Formation? "]?.trim();
    const naicsField = r["Primary NAICS Code - Entering Zeros Will Result in Immediate Rejection - Please take a moment to look up your NAICS Code"]?.trim();
    const currentFteField = r["As of today - how many Full Time Employees FTEs do you have at your business?"]?.trim();
    const plannedFteField = r["As of today - how many Full Time Employees FTEs do you plan to create with your business?"]?.trim();
    const revenueField = r["How much revenue did your business make from January 2024 - December 2024?"]?.trim();
    const womanField = r["The company is at least 51% owned and controlled by one or more women."]?.trim();
    const minField = r["The company is at least 51% owned and controlled by one or more, or any combination of, Black or African Americans; Latino or Hispanic Americans; Native Americans (Alaska natives, native Hawaiians, or enrolled members of a federally or State recognized Indian tribe); Asian Americans/Asian Pacific/Asian Indian and/or Pacific Islanders; Other persons of color."]?.trim();
    const vetField = r["The company is at least 51% owned and controlled by one or more veterans of any military branch of the United States."]?.trim();
    const submittedField = r["Submission Date"]?.trim();
    const approvalField = r["When Approved (By Quarter)"]?.trim();
    const descField = r[" Please provide a brief description of your products and services which includes a your business model (the product or service sold and the customer problem that it solves)"]?.trim();

    if (nameField && !existing.name) existing.name = nameField;
    if (bizField && !existing.businessName) existing.businessName = bizField;
    if (phoneField && !existing.phone) existing.phone = phoneField;
    if (cityField && !existing.city) existing.city = cityField;
    if (stateField && !existing.state) existing.state = stateField;
    if (countyField && !existing.county) existing.county = countyField;
    if (websiteField && websiteField.toLowerCase() !== "n/a" && !existing.website) existing.website = websiteField;
    if (industryField && !existing.industry) existing.industry = industryField;
    if (formationField && !existing.formationType) existing.formationType = formationField;
    if (naicsField && naicsField !== "0" && !existing.naicsCode) existing.naicsCode = naicsField;
    if (currentFteField && existing.currentFte === null) existing.currentFte = parseFte(currentFteField);
    if (plannedFteField && existing.plannedFte === null) existing.plannedFte = parseFte(plannedFteField);
    if (revenueField && !existing.annualRevenue) existing.annualRevenue = parseRevenue(revenueField);
    if (womanField?.toLowerCase() === "yes") existing.isWomanOwned = true;
    if (minField?.toLowerCase() === "yes") existing.isMinorityOwned = true;
    if (vetField?.toLowerCase() === "yes") existing.isVeteranOwned = true;
    if (approvalField && !existing.leapStatus) existing.leapStatus = approvalField;
    if (submittedField && !existing.leapSubmittedAt) existing.leapSubmittedAt = parseDate(submittedField);
    if (descField && !existing.description) existing.description = descField;

    byEmail.set(email, existing);
  }

  return byEmail;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading CSVs…");
  const [intake, survey, appForm] = await Promise.all([
    parseCSV(path.join(DOWNLOADS, "October Site Visit Data - Fledge(LEAP Intake Form Data).csv")),
    parseCSV(path.join(DOWNLOADS, "October Site Visit Data - Fledge(LEAP Survey Results - Fledge ).csv")),
    parseCSV(path.join(DOWNLOADS, "THEFLEDGE_Tri-County_Resource_for_Entrepr2025-05-19_23_34_22.csv")),
  ]);

  const merged = mergeRecords(intake, survey, appForm);
  console.log(`Merged ${merged.size} unique entrepreneurs`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const rec of merged.values()) {
    if (!rec.email || !rec.email.includes("@")) { skipped++; continue; }

    try {
      // Check if User already exists
      const existingUser = await prisma.user.findUnique({ where: { email: rec.email } });
      let userId: string;

      if (existingUser) {
        // Update phone/isImported flag if missing
        if (!existingUser.phone && rec.phone) {
          await prisma.user.update({ where: { id: existingUser.id }, data: { phone: rec.phone, isImported: true } });
        }
        userId = existingUser.id;
        // Check if they already have a business
        const existingBiz = await prisma.businessMember.findFirst({ where: { userId } });
        if (existingBiz) { skipped++; continue; }
      } else {
        // Create user with no password (isImported)
        const newUser = await prisma.user.create({
          data: {
            name: rec.name || rec.email.split("@")[0],
            email: rec.email,
            phone: rec.phone || null,
            isImported: true,
          },
        });
        userId = newUser.id;
      }

      // Create Business
      const biz = await prisma.business.create({
        data: {
          name: rec.businessName || `${rec.name || rec.email}'s Business`,
          description: rec.description || null,
          industry: rec.industry || null,
          city: rec.city || null,
          state: rec.state || null,
          website: rec.website || null,
          phone: rec.phone || null,
          county: rec.county || null,
          formationType: rec.formationType || null,
          naicsCode: rec.naicsCode || null,
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

      console.log(`  ✓ ${rec.email} → ${biz.name}`);
      created++;
    } catch (err) {
      console.error(`  ✗ ${rec.email}: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (already exist), ${errors} errors`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });

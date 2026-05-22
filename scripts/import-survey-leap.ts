/**
 * Import 2025 LEAP survey data into the cohort DB.
 *
 * Strategy:
 *   - Match existing records by email (case-insensitive), with business-name fallback.
 *   - For duplicate-email rows (same person submitted in 2024 and 2025), keep the
 *     later submission date only.
 *   - For matched records: fill null fields; always update currentFte/annualRevenue
 *     (survey data is more recent).
 *   - For unmatched emails: create User + Business + BusinessMember (isImported/isAdminCreated).
 *   - Create BusinessFunding rows from 14 funding columns; dedup by (businessId, source, amount).
 *   - Create BusinessHire rows for new W-2 FTEs > 0; dedup by (businessId, note="Survey 2025").
 *   - Tolerance: duplicates preferred over missed data (only skip exact matches).
 *
 * Run: npx tsx scripts/import-survey-leap.ts [survey.csv]
 */

import { createReadStream } from "fs";
import * as readline from "readline";
import path from "path";
import { randomBytes } from "crypto";
import { config } from "dotenv";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: path.join(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DOWNLOADS = path.join(process.env.HOME!, "Downloads");
const DEFAULT_FILE = path.join(DOWNLOADS, "October Site Visit Data - Fledge(LEAP Survey Results - Fledge ).csv");

// ── CSV parser ─────────────────────────────────────────────────────────────────

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
        headers = currentRow.map(h => h.replace(/^﻿/, "").replace(/\xa0/g, " ").trim());
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function clean(s: string | undefined): string {
  return (s ?? "").replace(/\xa0/g, " ").replace(/Â\s*/g, "").trim();
}

function parseAmount(s: string): number | null {
  const n = parseFloat(clean(s).replace(/[$,]/g, ""));
  return isNaN(n) || n <= 0 ? null : n;
}

function parseDate(s: string): Date | null {
  if (!clean(s)) return null;
  const d = new Date(clean(s));
  return isNaN(d.getTime()) ? null : d;
}

function parseIntVal(s: string): number {
  const n = parseInt(clean(s), 10);
  return isNaN(n) ? 0 : n;
}

const BAD_LARA = /not\s*(found|registered|avail|yet)|none|n\/a|na\b|nl\b|being|in\s*progress|dissolved|removing|currently/i;

function cleanLara(s: string): string | null {
  const v = clean(s);
  if (!v || BAD_LARA.test(v)) return null;
  return v;
}

function normEmail(e: string): string {
  return clean(e).toLowerCase();
}

// Known email typo in DB: survey has pjkahari@gmail.com, DB has pjakahari@gmail.com
const EMAIL_FIXES: Record<string, string> = {
  "pjkahari@gmail.com": "pjakahari@gmail.com",
};

function resolveEmail(raw: string): string {
  const e = normEmail(raw);
  return EMAIL_FIXES[e] ?? e;
}

// ── Column names (exact from the CSV, with \xa0 normalized to space) ──────────

const COL = {
  submissionDate: "Submission Date",
  bizName: "Business Name",
  name: "Name",
  email: "Email",
  laraId: "What's your LARA ID?",
  laraDate: "When did you form/register your business with LARA?",
  revenue: "What was your business's total revenue in the past 12 months? ",
  currentFte: "How many full-time equivalent (FTE) employees does your business currently have (including yourself)? ",
  newW2: "How many new Full-Time Equivalent (W-2) jobs did your business create in the past 12 months?",

  // Funding
  bankLoan: "Amount of Bank Loans",
  friendsFamily: "Amount of Friends & Family Investment",
  angel: "Amount of Angel Investment",
  vc: "Amount of Venture Capital (non-MEDC) Investment",
  privateEquity: "Amount of Private Equity Investment",
  otherPrivate: "Amount of Other Private Investment",
  otherPrivateDesc: "Description of Other Private Investment",
  medc: "Amount of MEDC VC Funds (Michigan Rise Pre-Seed Fund Ill, Invest Detroit Ventures First Capital Fund, Invest Detroit Tech Startup Stabilization Fund - TSSF) Invested",
  etf: "Amount of Emerging Technologies Fund - ETF",
  brcc: "Amount of Biosciences Research and Commercialization Center - BRCC",
  baf: "Amount of Business Accelerator Funds (BAF)",
  laf: "Amount of Accelerator Funds ((Local Accelerator Funds (LAF), TREK Accelerator Fund (TAF), Direct TREK Accelerator Fund (DTAF))",
  oneAll: "Amount of One & All Seed Funding",
  sbir: "Amount of SBIR (Small Business Innovation Research) and/or STTR (Small Business Technology Transfer)",
  otherFederal: "Amount of Other Federal Funding Not Listed",
  otherFederalDesc: "Other Federal Funding Not Listed Description",
  otherPublic: "Amount of Other Public Funding Not Listed (State, Local, Non-Profit, Other Grants)",
  otherPublicDesc: "Other Public Funding Not Listed Description",
};

type FundingEntry = { col: string; type: "GRANT" | "LOAN" | "INVESTMENT"; sourceFixed?: string; descCol?: string };

const FUNDING_COLS: FundingEntry[] = [
  { col: COL.bankLoan,     type: "LOAN",       sourceFixed: "Bank Loan" },
  { col: COL.friendsFamily,type: "INVESTMENT",  sourceFixed: "Friends & Family" },
  { col: COL.angel,        type: "INVESTMENT",  sourceFixed: "Angel Investment" },
  { col: COL.vc,           type: "INVESTMENT",  sourceFixed: "Venture Capital" },
  { col: COL.privateEquity,type: "INVESTMENT",  sourceFixed: "Private Equity" },
  { col: COL.otherPrivate, type: "INVESTMENT",  descCol: COL.otherPrivateDesc },
  { col: COL.medc,         type: "INVESTMENT",  sourceFixed: "MEDC VC Funds" },
  { col: COL.etf,          type: "GRANT",       sourceFixed: "ETF" },
  { col: COL.brcc,         type: "GRANT",       sourceFixed: "BRCC" },
  { col: COL.baf,          type: "GRANT",       sourceFixed: "BAF" },
  { col: COL.laf,          type: "GRANT",       sourceFixed: "LAF/TAF/DTAF" },
  { col: COL.oneAll,       type: "GRANT",       sourceFixed: "One & All" },
  { col: COL.sbir,         type: "GRANT",       sourceFixed: "SBIR/STTR" },
  { col: COL.otherFederal, type: "GRANT",       descCol: COL.otherFederalDesc },
  { col: COL.otherPublic,  type: "GRANT",       descCol: COL.otherPublicDesc },
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const file = process.argv[2] ?? DEFAULT_FILE;
  console.log(`Survey file: ${file}\n`);

  const rawRows = await parseCSV(file);
  console.log(`Loaded ${rawRows.length} rows\n`);

  // Deduplicate: for rows with the same email, keep the later submission date
  const byEmail = new Map<string, CsvRow>();
  for (const row of rawRows) {
    const email = resolveEmail(row[COL.email]);
    if (!email) continue;
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, row);
    } else {
      const existDate = new Date(clean(existing[COL.submissionDate]));
      const rowDate = new Date(clean(row[COL.submissionDate]));
      if (rowDate > existDate) {
        console.log(`  dup  ${email}  keeping ${row[COL.submissionDate]} over ${existing[COL.submissionDate]}`);
        byEmail.set(email, row);
      } else {
        console.log(`  dup  ${email}  keeping ${existing[COL.submissionDate]} over ${row[COL.submissionDate]}`);
      }
    }
  }

  const rows = Array.from(byEmail.values());
  console.log(`\nDeduped to ${rows.length} rows\n`);

  let created = 0, updated = 0, skippedBiz = 0;
  let fundingCreated = 0, fundingSkipped = 0;
  let hiresCreated = 0, hiresSkipped = 0;

  for (const row of rows) {
    const email = resolveEmail(row[COL.email]);
    const bizName = clean(row[COL.bizName]) || "Unknown Business";
    const ownerName = clean(row[COL.name]);
    const laraId = cleanLara(row[COL.laraId]);
    const laraDate = parseDate(row[COL.laraDate]);
    const revenue = parseAmount(row[COL.revenue]);
    const currentFteVal = parseIntVal(row[COL.currentFte]);
    const submittedAt = parseDate(row[COL.submissionDate]);

    // Resolve business
    let businessId: string | null = null;
    let isNew = false;

    // Try email match
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const member = await prisma.businessMember.findFirst({ where: { userId: user.id } });
      businessId = member?.businessId ?? null;
    }

    // Fallback: business name
    if (!businessId && bizName) {
      const biz = await prisma.business.findFirst({
        where: { isAdminCreated: true, name: { equals: bizName, mode: "insensitive" } },
      });
      if (biz) businessId = biz.id;
    }

    if (businessId) {
      // Update existing business with survey data (fill nulls; always overwrite FTE/revenue)
      const biz = await prisma.business.findUnique({ where: { id: businessId } });
      if (biz) {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            ...(laraId && !biz.laraId ? { laraId } : {}),
            ...(laraDate && !biz.laraDate ? { laraDate } : {}),
            // Survey is more recent — always update these
            ...(currentFteVal > 0 ? { currentFte: currentFteVal } : {}),
            ...(revenue != null ? { annualRevenue: revenue } : {}),
          },
        });
      }
      // Update user name if we have one and the user exists
      if (user && ownerName && !user.name) {
        await prisma.user.update({ where: { id: user.id }, data: { name: ownerName } });
      }
      console.log(`  ~ update  ${bizName} (${email})`);
      updated++;
    } else {
      // Create new user + business + member
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: ownerName || null,
            isImported: true,
          },
        });
      }

      const biz = await prisma.business.create({
        data: {
          name: bizName,
          isAdminCreated: true,
          laraId: laraId ?? null,
          laraDate: laraDate ?? null,
          currentFte: currentFteVal > 0 ? currentFteVal : 0,
          annualRevenue: revenue ?? null,
        },
      });
      businessId = biz.id;

      await prisma.businessMember.create({
        data: { businessId, userId: user.id, role: "OWNER" },
      });

      console.log(`  + create  ${bizName} (${email})`);
      created++;
    }

    // ── Funding records ────────────────────────────────────────────────────────

    for (const fc of FUNDING_COLS) {
      const amount = parseAmount(row[fc.col] ?? "");
      if (amount == null) continue;

      const source = fc.sourceFixed
        ? fc.sourceFixed
        : (clean(row[fc.descCol ?? ""] ?? "") || fc.col.replace(/^Amount of /, ""));

      // Dedup: skip if exact match exists
      const existing = await prisma.businessFunding.findFirst({
        where: { businessId: businessId!, source, amount },
      });
      if (existing) {
        fundingSkipped++;
        continue;
      }

      await prisma.businessFunding.create({
        data: {
          businessId: businessId!,
          type: fc.type,
          source,
          amount,
          receivedAt: submittedAt,
          notes: "Survey 2025",
        },
      });
      fundingCreated++;
    }

    // ── Hire record for new W-2 jobs ───────────────────────────────────────────

    const newW2 = parseIntVal(row[COL.newW2]);
    if (newW2 > 0) {
      const existingHire = await prisma.businessHire.findFirst({
        where: { businessId: businessId!, notes: "Survey 2025" },
      });
      if (existingHire) {
        hiresSkipped++;
      } else {
        await prisma.businessHire.create({
          data: {
            businessId: businessId!,
            fteAdded: newW2,
            hiredAt: submittedAt,
            notes: "Survey 2025",
          },
        });
        hiresCreated++;
      }
    }
  }

  console.log(`
Done:
  Businesses created: ${created}
  Businesses updated: ${updated}
  Funding records created: ${fundingCreated}
  Funding records skipped (exact dup): ${fundingSkipped}
  Hire records created: ${hiresCreated}
  Hire records skipped (exact dup): ${hiresSkipped}
`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

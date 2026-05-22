/**
 * Import HubSpot tickets into funding, connections, and hire records.
 *
 * Ticket name conventions:
 *   "Funding - SOURCE"  → BusinessFunding (type inferred from source name)
 *   "Funding"           → BusinessFunding (type GRANT, source General)
 *   "Connection"        → BusinessConnection (resource = description field)
 *   "FTE"               → BusinessHire (fteAdded = description field)
 *
 * Join key: extract email from "Associated Contact" (format: "Name (email)")
 *           → find User → find Business via BusinessMember
 *
 * Run: npx tsx scripts/import-hubspot-tickets.ts [tickets.csv]
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

// ── CSV parser ────────────────────────────────────────────────────────────────

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
        headers = currentRow.map(h => h.replace(/^﻿/, "").trim());
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanStr(s: string | undefined): string {
  return (s ?? "").replace(/Â\s*/g, "").replace(/ /g, " ").trim();
}

function extractEmail(contact: string): string | null {
  const m = cleanStr(contact).match(/\(([^)]+@[^)]+)\)/);
  return m ? m[1].toLowerCase().trim() : null;
}

function parseAmount(s: string): number | null {
  const n = parseFloat(cleanStr(s).replace(/[$,]/g, ""));
  return isNaN(n) || n <= 0 ? null : n;
}

function parseDate(s: string): Date | null {
  if (!s || !s.trim()) return null;
  const d = new Date(cleanStr(s));
  return isNaN(d.getTime()) ? null : d;
}

type FundingType = "GRANT" | "LOAN" | "PRIZE" | "INVESTMENT" | "OTHER";

function inferFundingType(ticketName: string): FundingType {
  const n = ticketName.toLowerCase();
  if (n.includes("loan")) return "LOAN";
  if (n.includes("angel") || n.includes("investment") || n.includes("investor")) return "INVESTMENT";
  if (n.includes("99 prob") || n.includes("prize") || n.includes("contest") || n.includes("competition")) return "PRIZE";
  return "GRANT";
}

function extractSource(ticketName: string): string {
  // "Funding - SOURCE - MORE" → "SOURCE"
  // "Funding - SOURCE" → "SOURCE"
  // "Funding" → "General"
  const parts = ticketName.split("-").map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return "General";
  // parts[0] is "Funding", parts[1] is the source, ignore rest
  const src = parts[1];
  // Normalize "99 probs" → "99 Problems"
  if (src.toLowerCase().includes("99 prob")) return "99 Problems";
  return src;
}

type TicketKind = "funding" | "connection" | "fte" | "skip";

function classifyTicket(name: string): TicketKind {
  const n = name.toLowerCase().trim();
  if (n.startsWith("funding")) return "funding";
  if (n === "connection") return "connection";
  if (n === "fte") return "fte";
  return "skip";
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const file = args[0] ?? path.join(DOWNLOADS, "hubspot-crm-exports-trek-funding-2026-05-22.csv");
  console.log(`Tickets file: ${file}\n`);

  const tickets = await parseCSV(file);
  console.log(`Loaded ${tickets.length} tickets\n`);

  let funded = 0, connected = 0, hired = 0, skipped = 0, errors = 0;

  for (const t of tickets) {
    const ticketName = cleanStr(t["Ticket name"]);
    const kind = classifyTicket(ticketName);

    if (kind === "skip") {
      console.log(`  → skip  "${ticketName}" (unrecognized type)`);
      skipped++;
      continue;
    }

    // Resolve the business via contact email
    const email = extractEmail(t["Associated Contact"]);
    let businessId: string | null = null;

    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const member = await prisma.businessMember.findFirst({ where: { userId: user.id } });
        businessId = member?.businessId ?? null;
      }
    }

    // Fall back to company name if contact email not found
    if (!businessId) {
      const companyName = cleanStr(t["Associated Company"]);
      if (companyName) {
        const biz = await prisma.business.findFirst({
          where: { isAdminCreated: true, name: { equals: companyName, mode: "insensitive" } },
        });
        businessId = biz?.id ?? null;
      }
    }

    if (!businessId) {
      const companyName = cleanStr(t["Associated Company"]);
      console.log(`  ✗ no match  "${companyName}" (${email ?? "no email"})`);
      errors++;
      continue;
    }

    const date = parseDate(t["Create date"]);
    const description = cleanStr(t["Ticket description"]);

    try {
      if (kind === "funding") {
        const type = inferFundingType(ticketName);
        const source = extractSource(ticketName);
        const amount = parseAmount(description);

        await prisma.businessFunding.create({
          data: { businessId, type, source, amount, receivedAt: date, notes: null },
        });
        console.log(`  ✓ funding   ${cleanStr(t["Associated Company"])}  →  ${source} ${type} ${amount != null ? `$${amount.toLocaleString()}` : "(no amount)"}`);
        funded++;
      } else if (kind === "connection") {
        const resource = description || ticketName;
        await prisma.businessConnection.create({
          data: { businessId, resource, description: null, connectedAt: date, notes: null },
        });
        console.log(`  ✓ connect   ${cleanStr(t["Associated Company"])}  →  ${resource}`);
        connected++;
      } else if (kind === "fte") {
        const fteAdded = Math.round(parseFloat(description) || 1);
        await prisma.businessHire.create({
          data: { businessId, fteAdded, hiredAt: date, notes: null },
        });
        await prisma.business.update({
          where: { id: businessId },
          data: { currentFte: { increment: fteAdded } },
        });
        console.log(`  ✓ hire      ${cleanStr(t["Associated Company"])}  →  +${fteAdded} FTE`);
        hired++;
      }
    } catch (err) {
      console.error(`  ✗ error     ${cleanStr(t["Associated Company"])}: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone: ${funded} funding, ${connected} connections, ${hired} hire events, ${skipped} skipped, ${errors} errors`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

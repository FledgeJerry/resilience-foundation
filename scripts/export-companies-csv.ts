// Companies-only export: every Business, one row each, with every raw field
// plus funding and activity aggregates — for manually cross-checking LARA,
// minority-owned, funding, and FTE figures against whatever definitions
// Jerry wants to apply himself, rather than the LEAP-specific rules baked
// into leap-trek-export.ts. Deliberately more columns than needed rather
// than fewer.
//
// Run: npx tsx scripts/export-companies-csv.ts
import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import { prisma } from "../src/lib/prisma";

const OUT_DIR = "leap-trek-export";
mkdirSync(OUT_DIR, { recursive: true });

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
function toCsv(header: string[], rows: unknown[][]): string {
  return [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}
function splitName(name: string | null): [string, string] {
  if (!name) return ["", ""];
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
}

async function main() {
  const businesses = await prisma.business.findMany({
    include: {
      members: { include: { user: true } },
      cohort: true,
      funding: true,
      connections: true,
      hires: true,
      deals: true,
      contacts: true,
      transactions: true,
      timeLogs: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "business_id",
    "owner_first_name", "owner_last_name", "owner_email", "owner_phone",
    "owner_race_ethnicity", "owner_gender",
    "company_legal_name", "entity_type", "industry", "description", "website", "notes",
    "problem_statement", "target_market", "unique_value",
    "street_address", "city", "state", "zip", "county", "lat", "lng",
    "lara_registered", "lara_entity_id", "lara_filing_date", "business_start_date",
    "current_fte", "planned_fte", "annual_revenue",
    "is_minority_owned", "is_woman_owned", "is_veteran_owned", "is_disability_owned",
    "leap_status", "leap_submitted_at", "is_admin_created",
    "cohort_name", "cohort_program", "cohort_year",
    "funding_total_amount", "funding_count", "funding_types", "funding_sources",
    "connections_count", "hires_count", "deals_count", "contacts_count", "transactions_count",
    "time_log_entries_count", "time_log_hours_total",
    "created_at", "updated_at",
  ];

  const rows: unknown[][] = [];
  for (const b of businesses) {
    const owner = b.members.find((m) => m.role === "OWNER")?.user ?? b.members[0]?.user ?? null;
    const [ownerFirst, ownerLast] = splitName(owner?.name ?? null);

    const fundingTotal = b.funding.reduce((s, f) => s + (f.amount ?? 0), 0);
    const fundingTypes = [...new Set(b.funding.map((f) => f.type))].join(";");
    const fundingSources = b.funding
      .map((f) => `${f.source || "?"}: $${(f.amount ?? 0).toFixed(2)}${f.receivedAt ? ` (${f.receivedAt.toISOString().slice(0, 10)})` : ""}`)
      .join("; ");

    const timeLogHours = b.timeLogs.reduce((s, t) => s + t.hours, 0);

    rows.push([
      b.id,
      ownerFirst, ownerLast, owner?.email ?? "", b.phone || owner?.phone || "",
      owner?.raceEthnicity ?? "", owner?.gender ?? "",
      b.name, b.formationType ?? "", b.industry ?? "", b.description ?? "", b.website ?? "", b.notes ?? "",
      b.problemStatement ?? "", b.targetMarket ?? "", b.uniqueValue ?? "",
      b.street ?? "", b.city ?? "", b.state ?? "", b.zip ?? "", b.county ?? "", b.lat ?? "", b.lng ?? "",
      b.laraId || b.laraDate ? "Y" : "N", b.laraId ?? "", b.laraDate, b.formationDate,
      b.currentFte, b.plannedFte, b.annualRevenue,
      b.isMinorityOwned ? "Y" : "N", b.isWomanOwned ? "Y" : "N", b.isVeteranOwned ? "Y" : "N", b.isDisabilityOwned ? "Y" : "N",
      b.leapStatus ?? "", b.leapSubmittedAt, b.isAdminCreated ? "Y" : "N",
      b.cohort?.name ?? "", b.cohort?.program ?? "", b.cohort?.year ?? "",
      fundingTotal.toFixed(2), b.funding.length, fundingTypes, fundingSources,
      b.connections.length, b.hires.length, b.deals.length, b.contacts.length, b.transactions.length,
      b.timeLogs.length, timeLogHours.toFixed(2),
      b.createdAt, b.updatedAt,
    ]);
  }

  writeFileSync(`${OUT_DIR}/companies_export.csv`, toCsv(header, rows));
  console.error(`\nWrote ${OUT_DIR}/companies_export.csv — ${rows.length} companies, ${header.length} columns.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

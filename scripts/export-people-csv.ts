// Exports every User (person) with every field on their record, joined to
// every Business they're a member of (one row per user-business pair; users
// with no business yet still get one row with blank business columns).
// Deliberately excludes passwordHash (security) and Contact (a business's
// own leads/customers, not the entrepreneur/person themselves — a separate
// export if that's ever needed).
// Run: npx tsx scripts/export-people-csv.ts > people-export.csv
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const USER_FIELDS = [
  "id", "name", "email", "emailVerified", "role", "createdAt",
  "street", "city", "state", "zip", "lat", "lng",
  "ageRange", "gender", "raceEthnicity",
  "hasIdea", "foundingGroup", "biggestBarrier", "readinessStage", "workedAtCoop", "wouldConvert",
  "phone", "isImported", "emailSubscribed",
] as const;

const BUSINESS_FIELDS = [
  "id", "name", "description", "type", "stage", "industry",
  "street", "city", "state", "zip", "lat", "lng", "website", "notes",
  "problemStatement", "targetMarket", "uniqueValue",
  "phone", "county", "formationType", "laraId", "laraDate", "naicsCode",
  "currentFte", "plannedFte", "annualRevenue", "formationDate",
  "isMinorityOwned", "isWomanOwned", "isVeteranOwned", "isDisabilityOwned",
  "leapStatus", "leapSubmittedAt", "isAdminCreated", "createdAt", "updatedAt",
] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function main() {
  const users = await prisma.user.findMany({
    include: {
      businessMemberships: {
        include: { business: { include: { cohort: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    ...USER_FIELDS.map((f) => `person_${f}`),
    "business_role",
    ...BUSINESS_FIELDS.map((f) => `business_${f}`),
    "cohort_name", "cohort_program", "cohort_year",
  ];
  const rows: string[] = [header.join(",")];

  for (const user of users) {
    const userValues = USER_FIELDS.map((f) => csvEscape((user as Record<string, unknown>)[f]));

    if (user.businessMemberships.length === 0) {
      rows.push([...userValues, ...Array(1 + BUSINESS_FIELDS.length + 3).fill("")].join(","));
      continue;
    }

    for (const membership of user.businessMemberships) {
      const b = membership.business;
      const businessValues = BUSINESS_FIELDS.map((f) => csvEscape((b as Record<string, unknown>)[f]));
      rows.push([
        ...userValues,
        csvEscape(membership.role),
        ...businessValues,
        csvEscape(b.cohort?.name),
        csvEscape(b.cohort?.program),
        csvEscape(b.cohort?.year),
      ].join(","));
    }
  }

  console.log(rows.join("\n"));
  console.error(`\nExported ${users.length} people, ${rows.length - 1} rows total (one row per person-business pair).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

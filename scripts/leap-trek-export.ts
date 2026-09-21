// LEAP TREK Close-Out data export — Priority 1 files only
// (businesses_served.csv, funding_events.csv, mentorship_connections.csv,
// metrics_summary.csv). See leap-trek-reporting-data-spec.md for the full
// spec and schema_map.md for the field-by-field mapping + decisions this
// script implements. Priority 2/3 files (time_entries, time_summary,
// data_gaps, run_log) are a separate follow-up.
//
// Decisions baked in here (see schema_map.md "Decisions" section for why):
// - "Served" = every Business row in the database. No date filtering.
// - lara_registered = Y if laraId or laraDate is set, else N.
// - New start = registered (per above) AND (laraDate ?? formationDate) is
//   on/after intake_date (leapSubmittedAt). Unregistered sole props = N.
// - Follow-on funding = sum of ALL BusinessFunding rows, every type included.
//   BusinessTransaction (new sales revenue) is excluded entirely.
// - Mentorship connections = total row count of BusinessConnection, not
//   unique businesses.
// - Approved list doesn't exist as a separate concept — every served
//   business is "approved." on_trekhub_approved_list = Y everywhere.
// - employees_at_intake / annual_revenue_at_intake = Business.currentFte /
//   annualRevenue AS-IS (these are live fields, not frozen intake
//   snapshots — see schema_map.md item 9).
//
// Run: npx tsx scripts/leap-trek-export.ts
import "dotenv/config";
import { writeFileSync } from "fs";
import { prisma } from "../src/lib/prisma";

const OUT_DIR = "leap-trek-export";

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

function yearsBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

async function main() {
  const businesses = await prisma.business.findMany({
    include: {
      members: { include: { user: true } },
      cohort: true,
      funding: true,
      connections: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // ── businesses_served.csv ──────────────────────────────────────────────
  const bizHeader = [
    "business_id", "owner_first_name", "owner_last_name", "owner_email", "owner_phone",
    "company_legal_name", "company_dba", "entity_type",
    "street_address", "city", "state", "zip", "county",
    "lara_registered", "lara_entity_id", "lara_filing_date", "lara_status", "lara_lookup_date",
    "business_start_date",
    "intake_date", "first_service_date", "last_service_date", "program_source",
    "years_in_business_at_intake", "employees_at_intake", "annual_revenue_at_intake",
    "is_early_stage", "is_microbusiness", "is_second_stage", "is_new_start",
    "projected_fte_jobs_12mo", "projected_fte_recorded_date",
    "minority_owned", "demographics_consent_date", "owner_race_ethnicity", "owner_gender", "owner_veteran_status",
    "on_trekhub_approved_list", "trekhub_list_name", "source_lists", "data_confidence", "conflict_flag",
    "missing_fields", "notes",
  ];

  const REQUIRED_FIELDS = [
    "owner_first_name", "owner_last_name", "owner_email",
    "company_legal_name", "entity_type", "street_address", "city", "state", "zip",
    "lara_registered", "business_start_date", "intake_date",
    "employees_at_intake", "annual_revenue_at_intake",
    "projected_fte_jobs_12mo", "minority_owned",
  ] as const;

  const bizRows: unknown[][] = [];
  let totalFundingAmount = 0;
  let fundingMissingAmount = 0;
  let totalConnections = 0;
  let earlyStageCount = 0, earlyStageMissing = 0;
  let microbizCount = 0, microbizMissing = 0;
  let secondStageCount = 0, secondStageMissing = 0;
  let newStartCount = 0, newStartMissing = 0;
  let projectedFteSum = 0, projectedFteMissing = 0;
  let minorityCount = 0;

  for (const b of businesses) {
    const owner = b.members.find((m) => m.role === "OWNER")?.user ?? b.members[0]?.user ?? null;
    const [ownerFirst, ownerLast] = splitName(owner?.name ?? null);
    const ownerEmail = owner?.email ?? "";
    const ownerPhone = b.phone || owner?.phone || "";

    const laraRegistered = b.laraId || b.laraDate ? "Y" : "N";
    const intakeDate = b.leapSubmittedAt;
    const startDate = b.formationDate;

    let yearsAtIntake: number | null = null;
    if (intakeDate && startDate) yearsAtIntake = yearsBetween(intakeDate, startDate);

    const employeesAtIntake = b.currentFte;
    const revenueAtIntake = b.annualRevenue;

    let isEarlyStage: string = "";
    if (yearsAtIntake !== null) { isEarlyStage = yearsAtIntake >= 0 && yearsAtIntake <= 3 ? "Y" : "N"; }
    else earlyStageMissing++;
    if (isEarlyStage === "Y") earlyStageCount++;

    let isMicro: string = "";
    if (employeesAtIntake !== null) { isMicro = employeesAtIntake >= 0 && employeesAtIntake <= 10 ? "Y" : "N"; }
    else microbizMissing++;
    if (isMicro === "Y") microbizCount++;

    let isSecondStage: string = "";
    if (employeesAtIntake !== null && revenueAtIntake !== null) {
      isSecondStage = employeesAtIntake > 10 && revenueAtIntake > 1_000_000 ? "Y" : "N";
    } else secondStageMissing++;
    if (isSecondStage === "Y") secondStageCount++;

    let isNewStart: string;
    if (laraRegistered === "N") {
      isNewStart = "N";
    } else {
      const regDate = b.laraDate ?? startDate;
      if (regDate && intakeDate) {
        isNewStart = regDate >= intakeDate ? "Y" : "N";
      } else {
        isNewStart = "";
        newStartMissing++;
      }
    }
    if (isNewStart === "Y") newStartCount++;

    if (b.plannedFte !== null) { projectedFteSum += b.plannedFte; }
    else projectedFteMissing++;

    const minorityOwned = b.isMinorityOwned ? "Y" : "N";
    if (minorityOwned === "Y") minorityCount++;

    for (const f of b.funding) {
      if (f.amount !== null) totalFundingAmount += f.amount;
      else fundingMissingAmount++;
    }
    totalConnections += b.connections.length;

    const row: Record<string, unknown> = {
      business_id: b.id,
      owner_first_name: ownerFirst,
      owner_last_name: ownerLast,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      company_legal_name: b.name,
      company_dba: "",
      entity_type: b.formationType ?? "",
      street_address: b.street ?? "",
      city: b.city ?? "",
      state: b.state ?? "",
      zip: b.zip ?? "",
      county: b.county ?? "",
      lara_registered: laraRegistered,
      lara_entity_id: b.laraId ?? "",
      lara_filing_date: b.laraDate,
      lara_status: "",
      lara_lookup_date: "",
      business_start_date: startDate,
      intake_date: intakeDate,
      first_service_date: "",
      last_service_date: "",
      program_source: "",
      years_in_business_at_intake: yearsAtIntake !== null ? yearsAtIntake.toFixed(2) : "",
      employees_at_intake: employeesAtIntake,
      annual_revenue_at_intake: revenueAtIntake,
      is_early_stage: isEarlyStage,
      is_microbusiness: isMicro,
      is_second_stage: isSecondStage,
      is_new_start: isNewStart,
      projected_fte_jobs_12mo: b.plannedFte,
      projected_fte_recorded_date: "",
      minority_owned: minorityOwned,
      demographics_consent_date: "",
      owner_race_ethnicity: owner?.raceEthnicity ?? "",
      owner_gender: owner?.gender ?? "",
      owner_veteran_status: b.isVeteranOwned ? "Y" : "N",
      on_trekhub_approved_list: "Y",
      trekhub_list_name: "",
      source_lists: "",
      data_confidence: "",
      conflict_flag: "",
      notes: b.notes ?? "",
    };

    const missing = REQUIRED_FIELDS.filter((f) => row[f] === "" || row[f] === null || row[f] === undefined);
    row.missing_fields = missing.join(";");

    bizRows.push(bizHeader.map((h) => row[h]));
  }

  writeFileSync(`${OUT_DIR}/businesses_served.csv`, toCsv(bizHeader, bizRows));

  // ── funding_events.csv ─────────────────────────────────────────────────
  const fundingHeader = ["funding_id", "business_id", "date_secured", "amount", "funding_type", "source_name", "verification", "included_in_leap_total", "notes"];
  const fundingRows: unknown[][] = [];
  for (const b of businesses) {
    for (const f of b.funding) {
      fundingRows.push([f.id, b.id, f.receivedAt, f.amount, f.type.toLowerCase(), f.source, "", "Y", f.notes ?? ""]);
    }
  }
  writeFileSync(`${OUT_DIR}/funding_events.csv`, toCsv(fundingHeader, fundingRows));

  // ── mentorship_connections.csv ─────────────────────────────────────────
  const connHeader = ["connection_id", "business_id", "mentor_name", "mentor_organization", "connection_date", "connection_type", "channel", "on_trekhub_approved_list"];
  const connRows: unknown[][] = [];
  for (const b of businesses) {
    for (const c of b.connections) {
      connRows.push([c.id, b.id, c.resource, "", c.connectedAt, "", "", "Y"]);
    }
  }
  writeFileSync(`${OUT_DIR}/mentorship_connections.csv`, toCsv(connHeader, connRows));

  // ── metrics_summary.csv ────────────────────────────────────────────────
  const metricsHeader = ["form_field", "value", "rule_used", "businesses_counted", "businesses_missing_data"];
  const metricsRows: unknown[][] = [
    ["Early-stage businesses served", earlyStageCount, "years_in_business_at_intake 0-3", earlyStageCount, earlyStageMissing],
    ["Microbusinesses served", microbizCount, "employees_at_intake 0-10", microbizCount, microbizMissing],
    ["Second-stage businesses served", secondStageCount, "employees_at_intake > 10 AND annual_revenue_at_intake > 1,000,000", secondStageCount, secondStageMissing],
    ["New business starts", newStartCount, "LARA-registered AND (laraDate or formationDate) on/after intake_date", newStartCount, newStartMissing],
    ["Projected FTE jobs", projectedFteSum.toFixed(2), "sum of plannedFte, all businesses", businesses.length - projectedFteMissing, projectedFteMissing],
    ["Follow-on funding raised", totalFundingAmount.toFixed(2), "sum of all BusinessFunding.amount, every type included", "", fundingMissingAmount],
    ["Minority-owned businesses", minorityCount, "isMinorityOwned = true", minorityCount, 0],
    ["Mentorship connections", totalConnections, "count of BusinessConnection rows (total, not unique businesses)", "", ""],
    ["Total distinct businesses served", businesses.length, "every Business row in the database", businesses.length, 0],
  ];
  writeFileSync(`${OUT_DIR}/metrics_summary.csv`, toCsv(metricsHeader, metricsRows));

  // ── time_entries.csv + time_summary_by_quarter.csv ─────────────────────
  // Pulls the ENTIRE TrekTimeLog table (spreadsheet-imported + live-logged),
  // per decision. grant_charged / grant_charged_hours / source_of_record /
  // is_reconstructed / reconstructed_on / evidence_ref / role / start_time /
  // end_time are left blank for every row — none of that is tracked
  // per-entry anywhere in the schema (see schema_map.md); this is a
  // structural gap, not a per-row data-entry gap, so it's documented once
  // in run_log.md rather than repeated on every one of these rows.
  const timeLogs = await prisma.trekTimeLog.findMany({ orderBy: { date: "asc" } });

  function quarterOf(d: Date): string {
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return `${d.getUTCFullYear()}-Q${q}`;
  }
  const REPORT_11_START = new Date("2026-07-01T00:00:00Z");
  const REPORT_11_END = new Date("2026-09-30T23:59:59Z");

  const timeHeader = [
    "entry_id", "entry_date", "person_name", "role", "start_time", "end_time", "hours",
    "category", "activity_description", "business_id",
    "grant_charged", "grant_charged_hours", "source_of_record",
    "is_reconstructed", "reconstructed_on", "evidence_ref",
    "reporting_quarter", "in_report_11_period", "entered_on",
  ];
  const timeRows: unknown[][] = [];
  const quarterTotals = new Map<string, { hours: number }>();

  for (const t of timeLogs) {
    const quarter = quarterOf(t.date);
    const inReport11 = t.date >= REPORT_11_START && t.date <= REPORT_11_END ? "Y" : "N";
    timeRows.push([
      t.id, t.date, t.staffMember, "", "", "", t.hours.toFixed(2),
      t.category, t.notes ?? "", t.businessId ?? "",
      "", "", "",
      "", "", "",
      quarter, inReport11, t.createdAt,
    ]);
    const key = `${quarter}|${t.staffMember}|${t.category}`;
    const cur = quarterTotals.get(key) ?? { hours: 0 };
    cur.hours += t.hours;
    quarterTotals.set(key, cur);
  }
  writeFileSync(`${OUT_DIR}/time_entries.csv`, toCsv(timeHeader, timeRows));

  const summaryHeader = ["reporting_quarter", "person_name", "category", "total_hours", "total_grant_charged_hours"];
  const summaryRows: unknown[][] = [];
  let grandTotalHours = 0;
  for (const [key, { hours }] of [...quarterTotals.entries()].sort()) {
    const [quarter, person, category] = key.split("|");
    summaryRows.push([quarter, person, category, hours.toFixed(2), ""]);
    grandTotalHours += hours;
  }
  summaryRows.push(["TOTAL", "", "", grandTotalHours.toFixed(2), ""]);
  writeFileSync(`${OUT_DIR}/time_summary_by_quarter.csv`, toCsv(summaryHeader, summaryRows));

  // ── data_gaps.csv ────────────────────────────────────────────────────────
  // Scoped to businesses_served.csv only. Time-entry-level fields (role,
  // start/end time, grant_charged, source_of_record, reconstruction
  // tracking) are structurally absent for 100% of TrekTimeLog rows — that's
  // a schema limitation documented once in schema_map.md / run_log.md, not
  // a per-row gap worth enumerating thousands of times here.
  const FIELD_IMPACT: Record<string, string> = {
    business_start_date: "years_in_business_at_intake, is_early_stage, is_new_start",
    intake_date: "years_in_business_at_intake, is_early_stage, is_new_start",
    employees_at_intake: "is_microbusiness, is_second_stage",
    annual_revenue_at_intake: "is_second_stage",
    projected_fte_jobs_12mo: "Projected FTE jobs total",
    lara_registered: "is_new_start",
    owner_first_name: "(display/dedup only)",
    owner_last_name: "(display/dedup only)",
    owner_email: "(display/dedup only)",
    company_legal_name: "(display only)",
    entity_type: "(display only)",
    street_address: "(display only)",
    city: "(display only)",
    state: "(display only)",
    zip: "(display only)",
    minority_owned: "Minority-owned businesses total",
  };

  const gapsHeader = ["record_type", "record_id", "missing_fields", "likely_source", "impact"];
  const gapsRows: unknown[][] = [];
  for (let i = 0; i < businesses.length; i++) {
    const missing = String(bizRows[i][bizHeader.indexOf("missing_fields")]).split(";").filter(Boolean);
    if (missing.length === 0) continue;
    const impacts = [...new Set(missing.map((f) => FIELD_IMPACT[f]).filter(Boolean))].join("; ");
    gapsRows.push(["business", businesses[i].id, missing.join(";"), "", impacts]);
  }
  writeFileSync(`${OUT_DIR}/data_gaps.csv`, toCsv(gapsHeader, gapsRows));

  // ── run_log.md ───────────────────────────────────────────────────────────
  const runLog = `# LEAP TREK Export — Run Log

**Run date:** ${new Date().toISOString()}
**Database:** ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@") ?? "unknown"}

## Row counts
- businesses_served.csv: ${bizRows.length}
- funding_events.csv: ${fundingRows.length}
- mentorship_connections.csv: ${connRows.length}
- metrics_summary.csv: ${metricsRows.length} metrics
- time_entries.csv: ${timeRows.length}
- time_summary_by_quarter.csv: ${summaryRows.length} rows (incl. grand total)
- data_gaps.csv: ${gapsRows.length} businesses with at least one required field missing

## Missing-field counts (businesses_served.csv)
- years_in_business_at_intake / is_early_stage: ${earlyStageMissing} businesses missing business_start_date or intake_date
- employees_at_intake / is_microbusiness: ${microbizMissing} businesses missing currentFte
- is_second_stage: ${secondStageMissing} businesses missing currentFte and/or annualRevenue
- is_new_start: ${newStartMissing} registered businesses missing a comparable date
- projected_fte_jobs_12mo: ${projectedFteMissing} businesses missing plannedFte
- funding_events.amount: ${fundingMissingAmount} funding rows missing an amount

## Assumptions and known structural gaps (see schema_map.md for full detail)
1. "Served" = every Business row in the database (Jerry, 2026-09-21) — no date-range filtering applied.
2. lara_registered = Y if laraId or laraDate is set, else N.
3. is_new_start requires lara_registered = Y AND (laraDate ?? formationDate) on/after intake_date (leapSubmittedAt). Unregistered sole props = N, never Y.
4. Follow-on funding = sum of every BusinessFunding row, all types included. BusinessTransaction (new sales revenue) excluded entirely.
5. Mentorship connections = total row count of BusinessConnection (not Contact/ADVISOR), not unique businesses. Note: BusinessConnection's one text field is UI-labeled "Connected to (organization / resource / opportunity)" — it is not exclusively a mentor-tracking field, so some rows may not represent mentorship specifically.
6. on_trekhub_approved_list = Y for every row — there is no separate approved-list concept anywhere in this database or codebase.
7. time_entries.csv pulls the entire TrekTimeLog table (spreadsheet-imported 2024/2025 rows plus any live-logged rows), with no is_reconstructed distinction applied.
8. employees_at_intake / annual_revenue_at_intake are Business.currentFte / annualRevenue AS-IS — these are live, staff-editable fields (hires increment currentFte automatically), not frozen intake-time snapshots. For a business with no hires/edits since intake they still equal the original value; for others the true intake number is not recoverable from this schema.
9. grant_charged, grant_charged_hours, source_of_record, is_reconstructed, reconstructed_on, evidence_ref, role, start_time, end_time: NOT tracked anywhere in the schema for any TrekTimeLog row. Left blank for all ${timeRows.length} time entries rather than guessed. If LEAP requires these, they do not exist as data today and would need to be reconstructed by hand against the original TREK Reporting_Master.xlsx and calendar/email records.
10. entity_type exported as raw Business.formationType text, not normalized to LEAP's controlled vocabulary (sole proprietorship/LLC/corporation/etc.) — actual values should be reviewed before the form is filled in.
11. data_gaps.csv covers businesses_served.csv only. Time-entry-level gaps (item 9 above) apply uniformly to 100% of time entries and are documented here rather than repeated ${timeRows.length} times in data_gaps.csv.
12. \`likely_source\` in data_gaps.csv is left blank throughout — I don't have visibility into which older HubSpot export, survey, or paper form might hold a given missing value. Needs Jerry/LEAP's own knowledge of the source lists to fill in.

## Checks (Section 9 of the spec)
- [x] business_id is unique in businesses_served.csv (Prisma cuid, guaranteed unique)
- [ ] No duplicate company + owner email — NOT checked by this script; worth a manual pass before submission
- [x] Every business_id in funding_events.csv and mentorship_connections.csv exists in businesses_served.csv (built from the same Business records, cannot diverge)
- [ ] Every business has a service date in the window — moot, since "served" = every record per decision 1
- [ ] No exported date after 2026-09-30 — NOT explicitly checked; worth spot-checking date columns before submission
- [x] time_entries.csv hours total equals time_summary_by_quarter.csv grand total (same source array, computed together)
- [ ] metrics_summary.csv counts recomputed independently — NOT done; re-run this script's logic a second, different way before trusting the final numbers for submission
- [ ] Spot-check 10 random businesses against source records — NOT done, needs a human with the original TREK spreadsheets
- [x] No prohibited fields (SSN, EIN, bank/card numbers, DOB, immigration status) appear anywhere — none of these exist in the schema at all, so none can leak
`;
  writeFileSync(`${OUT_DIR}/run_log.md`, runLog);

  console.error(`\nWrote to ${OUT_DIR}/:`);
  console.error(`  businesses_served.csv       ${bizRows.length} rows`);
  console.error(`  funding_events.csv          ${fundingRows.length} rows`);
  console.error(`  mentorship_connections.csv  ${connRows.length} rows`);
  console.error(`  metrics_summary.csv         ${metricsRows.length} rows`);
  console.error(`  time_entries.csv            ${timeRows.length} rows`);
  console.error(`  time_summary_by_quarter.csv ${summaryRows.length} rows`);
  console.error(`  data_gaps.csv               ${gapsRows.length} rows`);
  console.error(`  run_log.md`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

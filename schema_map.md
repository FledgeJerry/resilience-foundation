# LEAP TREK Data Export — Schema Map

Maps every field in `leap-trek-reporting-data-spec.md` to a table/column in
`prisma/schema.prisma`, or marks it `MISSING`. No data has been exported yet —
this is inspection only, per Section 0 of the spec.

Method: read the Prisma schema, then grepped `src/` for every model's Prisma
client accessor (camelCase, e.g. `businessHire`, not the PascalCase model name)
to confirm which tables are actually written to by the app vs. unused
scaffolding, and to see what the admin UI actually asks staff to enter.

---

## 1. `businesses_served.csv`

### Identity and contact
| Spec field | Source | Notes |
|---|---|---|
| `business_id` | `Business.id` | |
| `owner_first_name` | **MISSING** | `User.name` is one free-text field, not split first/last. Would need to split on first space at export time — ambiguous for compound last names. |
| `owner_last_name` | **MISSING** | Same as above. |
| `owner_email` | `User.email` via `BusinessMember` where `role = OWNER`, joined to `Business` | A `Business` can have multiple `BusinessMember` rows; only the `OWNER`-role one is "the owner" for this export. |
| `owner_phone` | `User.phone` **or** `Business.phone` | Both exist and can disagree — `Business.phone` is what LEAP intake forms actually populated (see `import-leap.ts`); `User.phone` is rarely set. Recommend `Business.phone` first, fall back to owner's `User.phone`. |

### Company
| Spec field | Source | Notes |
|---|---|---|
| `company_legal_name` | `Business.name` | No separate "legal name" vs. "DBA" distinction exists — `Business.name` is whatever was entered as the company name, which for imported LEAP records came from "What is the legal name of your business?". |
| `company_dba` | **MISSING** | No field. |
| `entity_type` | `Business.formationType` | Free text, not an enum — populated from the LEAP application's "What type of Business Formation?" open text field. Real values will need normalizing to the spec's controlled list (sole proprietorship / LLC / corporation / partnership / nonprofit / unregistered / other) — expect inconsistent capitalization/wording once we see actual production values. |
| `street_address` | `Business.street` | |
| `city` | `Business.city` | |
| `state` | `Business.state` | |
| `zip` | `Business.zip` | |
| `county` | `Business.county` | |

### LARA (Michigan) registration
| Spec field | Source | Notes |
|---|---|---|
| `lara_registered` | **MISSING** as an explicit flag | Could be inferred as `Y` when `laraId` is non-null, but that conflates "we don't know" with "not registered." Needs a decision (see open questions). |
| `lara_entity_id` | `Business.laraId` | |
| `lara_filing_date` | `Business.laraDate` | |
| `lara_status` | **MISSING** | No field tracks current LARA status (active/dissolved) as of a lookup — `laraDate` is a filing date, not a status. |
| `lara_lookup_date` | **MISSING** | No field records when LARA was last checked. |
| `business_start_date` | `Business.formationDate` | Best match, but note this is a separate field from `laraDate` — schema allows them to disagree (e.g., started operating before formally registering). |

### Service dates and intake facts
| Spec field | Source | Notes |
|---|---|---|
| `intake_date` | **MISSING**, best proxy `Business.leapSubmittedAt` | `leapSubmittedAt` comes from the LEAP application's "Submission Date" — close to intake but not labeled as such, and only populated for LEAP-imported businesses, not ones created other ways (self-signup, admin-created). |
| `first_service_date` | **MISSING** | No field on `Business` for this. Could theoretically be derived as the earliest `TrekTimeLog.date`, `BusinessConnection.connectedAt`, or `Deal`/`Contact` `createdAt` tied to the business, but nothing is labeled "service date" — would be a constructed value, not a stored fact. |
| `last_service_date` | **MISSING** | Same as above — derivable, not stored. |
| `program_source` | **MISSING** | `Cohort.program`/`Cohort.name` (via `Business.cohortId`) identifies which LEAP cohort a business belongs to, not which referral channel/program brought them in (Entrepreneurial Journey vs. 99 Problems vs. workshop vs. coaching). Those categories exist as free-text `TrekTimeLog.category` values on time entries, not as a property of the business itself. |
| `years_in_business_at_intake` | Calculated | Needs `business_start_date` and `intake_date`, both partially missing above — calculation will be incomplete for any business missing either. |
| `employees_at_intake` | `Business.currentFte` — **with a caveat** | `currentFte` is a **live, mutable** value: `POST /api/admin/cohort/[id]/hires` increments it every time staff log a new hire (`src/app/api/admin/cohort/[id]/hires/route.ts:33-36`), and the `/admin/cohort` UI also lets staff edit it directly. For a business with no hires logged since intake, `currentFte` still equals the intake-time value from `import-leap.ts`. For one with hires logged since, the original intake number is no longer recoverable from this field alone. There is no separate frozen snapshot. |
| `annual_revenue_at_intake` | `Business.annualRevenue` — same caveat | Directly editable via the admin UI; not guaranteed to still equal the intake value. |

### Calculated classification flags
All four (`is_early_stage`, `is_microbusiness`, `is_second_stage`, `is_new_start`) are pure calculations from the fields above — no additional schema mapping needed, but they inherit every gap listed above (especially `is_new_start`, which is entirely pending a definition — see open questions).

### Jobs
| Spec field | Source | Notes |
|---|---|---|
| `projected_fte_jobs_12mo` | `Business.plannedFte` | Populated at LEAP intake from "how many FTEs do you plan to create." Same "is this still current" caveat as `currentFte`/`annualRevenue` applies if a business's plan changed and was ever re-edited — but there's no separate write-path for `plannedFte` the way hires update `currentFte`, so in practice this one is more likely to still reflect the original intake answer. |
| `projected_fte_recorded_date` | **MISSING** | No timestamp for when `plannedFte` was set; `Business.updatedAt` is not a reliable proxy since it bumps on any field edit. |

### Ownership and demographics
| Spec field | Source | Notes |
|---|---|---|
| `minority_owned` | `Business.isMinorityOwned` (Boolean) | Spec wants `Y/N/Unknown/Declined`; schema only has a boolean defaulting to `false`, which cannot distinguish "confirmed not minority-owned" from "never asked/unknown." |
| `demographics_consent_date` | **MISSING** | No consent-tracking field anywhere in the schema. |
| `owner_race_ethnicity` | `User.raceEthnicity` (of the owner) | No linked consent record. |
| `owner_gender` | `User.gender` (of the owner) | Same. |
| `owner_veteran_status` | `Business.isVeteranOwned` (Boolean) | This is asked as a fact about the *business* ("company is ≥51% owned by veterans"), not the individual owner — conceptually close enough to use, but it's a business-level flag, not a person-level one. Same boolean-vs-Y/N/Unknown/Declined mismatch as `minority_owned`. |

Also present but **not asked for by the spec**: `Business.isWomanOwned`, `Business.isDisabilityOwned` — available if ever needed.

### Approved list and data quality
| Spec field | Source | Notes |
|---|---|---|
| `on_trekhub_approved_list` | **MISSING — no such concept exists anywhere in this schema or codebase.** | I grepped the whole `src/` tree; there is no table, field, or admin page representing a "TrekHub approved list." This is required for three of the eight headline metrics (minority-owned count, mentorship connections, and implicitly which businesses count at all) — this needs an answer before anything downstream of it can be built, not just a value choice. See open questions. |
| `trekhub_list_name` | **MISSING** | Depends entirely on the above. |
| `source_lists` | **MISSING** | No provenance/lineage tracking field on `Business` — we know from the import scripts that data came from up to three merged CSVs (intake form, survey, application form) plus manual admin entry, but the schema doesn't record *which* source(s) contributed to a given business's current field values. |
| `data_confidence` | **MISSING** | No field. |
| `conflict_flag` | **MISSING** | No field. `import-leap.ts`'s merge logic (`mergeRecords`) does a first-value-wins merge across the three source CSVs silently — it doesn't record when two sources disagreed, so that information is already lost for records imported that way. |
| `missing_fields` | N/A — computed at export time | Not a DB field by design; the export script will compute this per row. |
| `notes` | `Business.notes` | Exists and is free text; may or may not already contain relevant context. |

---

## 2. `funding_events.csv`

**The table exists and is actively used** (`prisma.businessFunding` is read/written by `src/app/api/admin/cohort/[id]/funding/route.ts` and `[fid]/route.ts`, editable from the admin cohort UI) — this is a real, staff-maintained log, not empty scaffolding.

| Spec field | Source | Notes |
|---|---|---|
| `funding_id` | `BusinessFunding.id` | |
| `business_id` | `BusinessFunding.businessId` | |
| `date_secured` | `BusinessFunding.receivedAt` | |
| `amount` | `BusinessFunding.amount` | |
| `funding_type` | `BusinessFunding.type` — **enum mismatch** | Our enum is `GRANT / LOAN / PRIZE / INVESTMENT / OTHER`. The spec needs `bank_loan / venture_capital / angel / SBIR / STTR / other_federal / new_sales_revenue_increase / grant_other / other`. These don't line up cleanly — e.g. our single `LOAN` doesn't distinguish "bank loan" from other loan types, our `INVESTMENT` doesn't distinguish VC from angel, and we have no way to represent SBIR/STTR/federal specifically. `new_sales_revenue_increase` isn't a "funding event" in our data model at all — that would come from `BusinessTransaction` (type `INCOME`), a completely different table that isn't itself wired into this spec. This needs a mapping decision, not just an export. |
| `source_name` | `BusinessFunding.source` | Free text (e.g., "Foster Swift" style entries, per the admin UI's placeholder pattern seen on the similar Connections tab). |
| `verification` | **MISSING** | No field distinguishes `documented` from `self_reported`. |
| `included_in_leap_total` | Calculated | Depends on the `funding_type` mapping above and LEAP's answer to which types count (open question). |
| `notes` | `BusinessFunding.notes` | |

---

## 3. `mentorship_connections.csv`

**The closest real table is `BusinessConnection`**, also actively used (`src/app/api/admin/cohort/[id]/connections/route.ts`, admin UI "Connections" tab). But it's modeling something broader than mentorship specifically — the actual UI label for its main field is **"Connected to (organization / resource / opportunity)"**, with placeholder examples like *"Capital Area Startup Studio, Foster Swift, Vending Opportunity…"* — i.e., staff use this to log any external connection made for a business (a mentor, a law firm referral, a sales lead), not mentorship exclusively.

| Spec field | Source | Notes |
|---|---|---|
| `connection_id` | `BusinessConnection.id` | |
| `business_id` | `BusinessConnection.businessId` | |
| `mentor_name` | **MISSING as a distinct field** | The single free-text `resource` field may or may not actually be a person's name — could be an org name, a lead, anything. There is no schema-level way to tell which `BusinessConnection` rows represent mentorship vs. something else. |
| `mentor_organization` | **MISSING** | Same field conflates person/org already. |
| `connection_date` | `BusinessConnection.connectedAt` | |
| `connection_type` | **MISSING** | No `introduction / session / ongoing` categorization exists. |
| `channel` | **MISSING** | |
| `on_trekhub_approved_list` | **MISSING** | Same missing concept as above, joined through the business. |

An alternative candidate is `Contact` with `type = ADVISOR` — but that table is populated by **entrepreneurs themselves** on their own self-service `/journey/businesses/[id]` CRM page (leads/customers/advisors/partners/investors/team), not by Fledge staff, and there's no reason to expect it's consistently filled in. This is a real fork in the road — see open questions.

---

## 4. `time_entries.csv`

`TrekTimeLog` is real and actively maintained — both bulk-imported from 2024/2025 spreadsheets (`scripts/import-time-tracking.ts`) and edited live via `src/app/api/admin/time/` and `src/app/api/admin/cohort/[id]/time/`.

| Spec field | Source | Notes |
|---|---|---|
| `entry_id` | `TrekTimeLog.id` | |
| `entry_date` | `TrekTimeLog.date` | |
| `person_name` | `TrekTimeLog.staffMember` | **First name only** — the import script deliberately truncates ("Jerry Norris" → "Jerry", "Jeremy Hurt" → "Jeremy"); live-entered rows may or may not follow the same convention. |
| `role` | **MISSING** | No per-entry role field. |
| `start_time` / `end_time` | **MISSING** | Only total `hours` is stored, no clock times. |
| `hours` | `TrekTimeLog.hours` | |
| `category` | `TrekTimeLog.category` — **free text, needs normalization** | Real values seen in the import script's own matching logic: "EJ Meetup," "99 Problems," "Admin," "Data/Reporting," "Trek Meeting," plus whatever named-entrepreneur session categories exist beyond the group-keyword list. The spec's target categories (Coaching and mentoring / Workshops and events / Weekly meetups / Platform development / Reporting and admin / Outreach and marketing / Other) will need an explicit mapping table once we see the actual distinct values in production — don't assume they line up 1:1. |
| `activity_description` | `TrekTimeLog.notes` | Closest match to "what was done"; was populated from the "Comments" column on import, so may be blank for many rows. |
| `business_id` | `TrekTimeLog.businessId` | Nullable by design — null means a group/admin entry not tied to one business (matches spec's "if applicable"). |
| `grant_charged` | **MISSING** | No field distinguishes grant-charged hours from other hours. |
| `grant_charged_hours` | **MISSING** | |
| `source_of_record` | **MISSING** | No field — but we know from the import script itself that all 2024/2025 rows came from a master Excel tracker (`TREK Reporting_Master.xlsx`), not a live timer/calendar tool. |
| `is_reconstructed` | **MISSING** | Related: since the *entire* 2024/2025 dataset was bulk-imported after the fact from a spreadsheet rather than entered contemporaneously per the spec's own definition, essentially all of those rows would need to be labeled reconstructed if we're strict about the spec's own rule — this is worth confirming with LEAP rather than assuming (see open questions, tied to #6). |
| `reconstructed_on` | **MISSING** | |
| `evidence_ref` | **MISSING** | |
| `reporting_quarter` | Calculated from `entry_date` | |
| `in_report_11_period` | Calculated from `entry_date` | |
| `entered_on` | `TrekTimeLog.createdAt` | For imported rows this is the *import* timestamp, not when the work actually happened — `entry_date` is the field that reflects the real work date. |

`time_summary_by_quarter.csv` is a pure aggregation of the above — no additional mapping needed once `time_entries.csv` is finalized.

---

## 5. `metrics_summary.csv`

Entirely calculated from the mappings above. Every one of the 8 metrics inherits at least one open gap:

| # | Metric | Blocked by |
|---|---|---|
| 1 | Early-stage businesses | `business_start_date`/`intake_date` gaps |
| 2 | Microbusinesses | `employees_at_intake` snapshot gap |
| 3 | Second-stage | Both of the above |
| 4 | New business starts | `is_new_start` definition entirely undefined (open question) |
| 5 | Projected FTE jobs | `Business.plannedFte` — mapping is solid, lowest-risk metric |
| 6 | Follow-on funding | `funding_type` enum mismatch (open question) |
| 7 | Minority-owned | `on_trekhub_approved_list` doesn't exist (open question) |
| 8 | Mentorship connections | `BusinessConnection` vs. `Contact` fork + `on_trekhub_approved_list` (open questions) |

---

## 6. Tables that exist but have **zero code paths writing to them**

Found via grep for Prisma's camelCase accessors — confirmed these are not dead ends, all except one are real:

- `BusinessTransaction` — **is used**, but only by entrepreneurs themselves via `/journey/businesses/[id]` (income/expense ledger for their own budget/balance-sheet documents), not by Fledge staff for reporting.
- Everything else referenced in this spec (`BusinessFunding`, `BusinessConnection`, `BusinessHire`, `TrekTimeLog`, `Cohort`, `Deal`, `Contact`) is actively read/written somewhere in `src/`. Nothing in this spec maps to genuinely dead/unused scaffolding — the gaps above are all "field doesn't exist" or "concept doesn't exist," not "table is unused."

---

## Summary: what this means for Section 0, step 2

Before writing any export code, the following spec items cannot be answered from the schema or code alone — they need Jerry's / LEAP's input (mapped to the spec's own Section 10 numbering, plus schema-driven detail added in brackets):

1. **"Served"** — what counts, given `first_service_date`/`last_service_date` aren't stored anywhere and would have to be derived from other tables' dates.
2. **New business starts** — no schema concept of this at all; needs a full definition before `is_new_start` can be built.
3. **Follow-on funding** — our `FundingType` enum (`GRANT/LOAN/PRIZE/INVESTMENT/OTHER`) doesn't match the spec's categories; needs a mapping, and a decision on whether `BusinessTransaction` (income) should feed "new sales" at all.
4. **Mentorship connections** — `BusinessConnection` (staff-logged, but is a general "resource connection," not mentor-specific) vs. `Contact` type `ADVISOR` (entrepreneur-self-logged) — which one is actually "mentorship," or do we need to hand-review `BusinessConnection` rows to sort mentor-type ones out?
5. **Approved list** — this literally does not exist anywhere in the app or database. Needs to know where it lives (a spreadsheet? Jerry's own records?) before `on_trekhub_approved_list` can be filled in for anyone.
6. **Time records / grant charging** — no `grant_charged` field exists, and relatedly: should the entire bulk-imported 2024/2025 dataset be flagged `is_reconstructed = Y` given it all came from a master spreadsheet after the fact, not live per-entry logging?
7. **Boundary cases** — pure business-rule question, not a schema question; can be answered independent of the above.

Additional gap not in the original 7 questions but discovered while mapping: `employees_at_intake` and `annual_revenue_at_intake` don't have frozen snapshots — `Business.currentFte`/`annualRevenue` are live values that can drift after intake via logged hires or manual admin edits. Worth deciding whether "best available current value" is an acceptable stand-in, flagged in `data_gaps.csv`, or whether it's worth reconstructing intake-time values from the original 2025 import source CSVs (which still exist in `~/Downloads` per the import script's expected file paths) for businesses where `currentFte`/`annualRevenue` no longer match what was originally imported.

No files beyond this one have been created. No export has been run.

---

## Decisions (Jerry, 2026-09-21)

Resolving the open questions above:

1. **Served** = every `Business` row in the database. No activity/date filtering — being in the database is being served.
2. **LARA registered** = `Y` if `Business.laraId` or `Business.laraDate` is non-null. No separate status/lookup-date tracking.
3. **New business starts** = `Business.formationDate` (or `laraDate` if that's what's populated) falls **on/after** that same business's own intake date (`leapSubmittedAt`, per the intake-date mapping above). Sole proprietorships with no LARA filing do **not** count as a "start" — a start requires an actual registration record.
4. **Follow-on funding** = sum of every `BusinessFunding.amount`, all `type` values included (no GRANT/LOAN/PRIZE/INVESTMENT/OTHER split) — `included_in_leap_total = Y` for all rows. `BusinessTransaction` (new sales revenue) is explicitly **excluded** — not a funding event for this report.
5. **Mentorship connections** = total row count of `BusinessConnection` (not `Contact`/`ADVISOR`), counting total connections, not unique businesses.
6. **Approved list** = there is no separate list — every served business counts as approved. `on_trekhub_approved_list = Y` for every row; `trekhub_list_name` left blank (no distinct list exists).
7. **Time entries** = the entire `TrekTimeLog` table, spreadsheet-imported rows and live-logged rows together, with no `is_reconstructed` distinction.
8. **Boundary cases** = not a practical concern with the current data — no special-casing needed.
9. **FTE / revenue snapshot gap** (raised by schema inspection, not originally in Section 10) = use `Business.currentFte` / `Business.annualRevenue` as-is — they're real database values, not invented ones — and flag in `data_gaps.csv` that they reflect the current value, not a verified point-in-time intake snapshot.
10. **`entity_type` normalization**: export `Business.formationType` as raw text rather than force-mapping to the spec's controlled vocabulary; mismatches get caught in `data_gaps.csv` review rather than silently guessed at export time.

With these resolved, Section 0 step 2 is done. Next: build the Priority 1 exports (`businesses_served.csv`, `funding_events.csv`, `mentorship_connections.csv`, `metrics_summary.csv`), test against local dev, then run against production per the established workflow.

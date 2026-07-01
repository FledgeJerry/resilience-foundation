-- Quarter is now derived from the date field at query time, not stored.
-- The 806 existing rows had manually-entered quarter strings; they are not
-- needed since quarter can always be computed from the date column.
ALTER TABLE "TrekTimeLog" DROP COLUMN "quarter";

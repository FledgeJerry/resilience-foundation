-- Adds LEAP TREK close-out fields to TrekTimeLog. All nullable; existing
-- rows are left NULL (whether they were contemporaneous is unknown).
ALTER TABLE "TrekTimeLog" ADD COLUMN "isReconstructed" BOOLEAN;
ALTER TABLE "TrekTimeLog" ADD COLUMN "reconstructedOn" TIMESTAMP(3);
ALTER TABLE "TrekTimeLog" ADD COLUMN "evidenceRef" TEXT;
ALTER TABLE "TrekTimeLog" ADD COLUMN "grantCharged" BOOLEAN;
ALTER TABLE "TrekTimeLog" ADD COLUMN "grantChargedHours" DOUBLE PRECISION;
ALTER TABLE "TrekTimeLog" ADD COLUMN "sourceOfRecord" TEXT;

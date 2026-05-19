-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "annualRevenue" DOUBLE PRECISION,
ADD COLUMN     "county" TEXT,
ADD COLUMN     "currentFte" INTEGER,
ADD COLUMN     "formationType" TEXT,
ADD COLUMN     "isAdminCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMinorityOwned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVeteranOwned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWomanOwned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leapStatus" TEXT,
ADD COLUMN     "leapSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "naicsCode" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "plannedFte" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isImported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT;

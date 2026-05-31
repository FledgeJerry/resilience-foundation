-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "zip" TEXT;

-- CreateTable
CREATE TABLE "RegionPulseCache" (
    "zip" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionPulseCache_pkey" PRIMARY KEY ("zip")
);

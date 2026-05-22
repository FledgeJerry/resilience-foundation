-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('GRANT', 'LOAN', 'PRIZE', 'INVESTMENT', 'OTHER');

-- CreateTable
CREATE TABLE "BusinessFunding" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "FundingType" NOT NULL DEFAULT 'GRANT',
    "amount" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFunding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BusinessFunding" ADD CONSTRAINT "BusinessFunding_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

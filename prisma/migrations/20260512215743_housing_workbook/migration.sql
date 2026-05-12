-- CreateEnum
CREATE TYPE "HousingProjectStatus" AS ENUM ('PLANNING', 'RAISING', 'PURCHASED', 'RENOVATING', 'RENTING', 'SOLD');

-- CreateEnum
CREATE TYPE "HousingMemberRole" AS ENUM ('OWNER', 'EDITOR');

-- CreateEnum
CREATE TYPE "TreasuryEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "HousingProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "HousingProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "address" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "renovationCost" DOUBLE PRECISION,
    "postRenoValue" DOUBLE PRECISION,
    "targetCloseDate" TIMESTAMP(3),
    "notes" TEXT,
    "totalShares" INTEGER NOT NULL DEFAULT 1000,
    "treasuryReservePct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "quorumPct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "simpleThreshold" DOUBLE PRECISION NOT NULL DEFAULT 51,
    "superThreshold" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "meetingCadence" TEXT NOT NULL DEFAULT 'Monthly',
    "disputeProcess" TEXT NOT NULL DEFAULT 'Peer mediation first, then community mediation',
    "monthlyRent" DOUBLE PRECISION,
    "propertyTax" DOUBLE PRECISION,
    "insurance" DOUBLE PRECISION,
    "maintenanceReserve" DOUBLE PRECISION,
    "rainyDayPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousingProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousingMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "HousingMemberRole" NOT NULL DEFAULT 'EDITOR',

    CONSTRAINT "HousingMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousingShareHolder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "shareCount" INTEGER NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTreasury" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HousingShareHolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TreasuryEntryType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryVote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "surplus" DOUBLE PRECISION NOT NULL,
    "decision" TEXT NOT NULL,
    "amountDistributed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HousingMember_projectId_userId_key" ON "HousingMember"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "HousingMember" ADD CONSTRAINT "HousingMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HousingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousingMember" ADD CONSTRAINT "HousingMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousingShareHolder" ADD CONSTRAINT "HousingShareHolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HousingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryEntry" ADD CONSTRAINT "TreasuryEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HousingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryVote" ADD CONSTRAINT "TreasuryVote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HousingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('UNDECIDED', 'TRADITIONAL', 'COOP');

-- CreateEnum
CREATE TYPE "BusinessStage" AS ENUM ('IDEA', 'KNOW_GROUND', 'FIND_PEOPLE', 'BUILD_STRUCTURE', 'TEST_SMALL', 'GET_SUPPORT', 'SUSTAIN', 'GROW');

-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'EDITOR');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('LEAD', 'CUSTOMER', 'ADVISOR', 'PARTNER', 'INVESTOR', 'TEAM', 'OTHER');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BusinessType" NOT NULL DEFAULT 'UNDECIDED',
    "stage" "BusinessStage" NOT NULL DEFAULT 'IDEA',
    "industry" TEXT,
    "city" TEXT,
    "state" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "problemStatement" TEXT,
    "targetMarket" TEXT,
    "uniqueValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'EDITOR',

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'LEAD',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "stage" "DealStage" NOT NULL DEFAULT 'PROSPECT',
    "notes" TEXT,
    "closeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTransaction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTransaction" ADD CONSTRAINT "BusinessTransaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

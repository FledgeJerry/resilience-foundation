-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "cohortId" TEXT,
ADD COLUMN     "formationDate" TIMESTAMP(3),
ADD COLUMN     "isDisabilityOwned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "program" TEXT,
    "year" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_name_key" ON "Cohort"("name");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "HousingProject" ADD COLUMN     "mortgageInterestRate" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
ADD COLUMN     "mortgageLoanTerm" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "HousingShareHolder" ADD COLUMN     "equityBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isRenter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlyRentPaid" DOUBLE PRECISION,
ADD COLUMN     "moveInDate" TIMESTAMP(3);

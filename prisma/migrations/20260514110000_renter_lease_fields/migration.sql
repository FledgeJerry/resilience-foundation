ALTER TABLE "HousingShareHolder" ADD COLUMN "securityDeposit" DOUBLE PRECISION;
ALTER TABLE "HousingShareHolder" ADD COLUMN "leaseEndDate" TIMESTAMP(3);
ALTER TABLE "HousingShareHolder" ADD COLUMN "occupantCount" INTEGER;
ALTER TABLE "HousingShareHolder" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "HousingShareHolder" ADD COLUMN "emergencyContactPhone" TEXT;

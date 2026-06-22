-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "geocodeTriedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Coop" ADD COLUMN     "geocodeTriedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HousingProject" ADD COLUMN     "geocodeTriedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "geocodeTriedAt" TIMESTAMP(3);

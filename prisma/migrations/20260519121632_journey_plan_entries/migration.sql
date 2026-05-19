-- CreateTable
CREATE TABLE "BusinessPlanEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPlanEntry_businessId_fieldId_key" ON "BusinessPlanEntry"("businessId", "fieldId");

-- AddForeignKey
ALTER TABLE "BusinessPlanEntry" ADD CONSTRAINT "BusinessPlanEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

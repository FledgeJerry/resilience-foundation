-- CreateTable
CREATE TABLE "TrekTimeLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quarter" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "staffMember" TEXT NOT NULL,
    "notes" TEXT,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrekTimeLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrekTimeLog" ADD CONSTRAINT "TrekTimeLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

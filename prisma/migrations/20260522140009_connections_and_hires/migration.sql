-- CreateTable
CREATE TABLE "BusinessConnection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "description" TEXT,
    "connectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHire" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fteAdded" INTEGER NOT NULL,
    "hiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessHire_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BusinessConnection" ADD CONSTRAINT "BusinessConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHire" ADD CONSTRAINT "BusinessHire_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

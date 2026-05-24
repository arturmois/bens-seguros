-- CreateEnum
CREATE TYPE "UsageUnitType" AS ENUM ('TOKEN', 'CHARACTER', 'IMAGE');

-- CreateTable
CREATE TABLE "AiUsageRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "channelIdHash" TEXT,
    "conversationIdHash" TEXT,
    "messageIdHash" TEXT,
    "agentIdHash" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputQuantity" INTEGER NOT NULL,
    "outputQuantity" INTEGER NOT NULL,
    "unitType" "UsageUnitType" NOT NULL,
    "inputCostMicrocents" INTEGER NOT NULL,
    "outputCostMicrocents" INTEGER NOT NULL,
    "countedAsIncluded" BOOLEAN DEFAULT true,
    "overageCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageRecord_organizationId_createdAt_idx" ON "AiUsageRecord"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageRecord_organizationId_periodKey_idx" ON "AiUsageRecord"("organizationId", "periodKey");

-- AddForeignKey
ALTER TABLE "AiUsageRecord" ADD CONSTRAINT "AiUsageRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

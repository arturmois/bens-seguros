-- Add organizationId to Occurrence with tenant isolation backfill
ALTER TABLE "Occurrence" ADD COLUMN "organizationId" TEXT;

-- Backfill from the parent Claim
UPDATE "Occurrence" o
SET "organizationId" = c."organizationId"
FROM "Claim" c
WHERE o."claimId" = c."id";

-- Enforce NOT NULL now that existing rows are populated
ALTER TABLE "Occurrence" ALTER COLUMN "organizationId" SET NOT NULL;

-- Index for tenant-scoped queries
CREATE INDEX "Occurrence_organizationId_idx" ON "Occurrence"("organizationId");

-- Row Level Security
ALTER TABLE "Occurrence" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Occurrence"
  USING ("organizationId" = current_setting('app.current_tenant', true));
ALTER TABLE "Occurrence" FORCE ROW LEVEL SECURITY;

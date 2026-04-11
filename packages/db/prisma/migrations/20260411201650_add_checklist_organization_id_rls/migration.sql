-- Step 1: add the column as nullable so existing rows don't break
ALTER TABLE "ProposalChecklistItem" ADD COLUMN "organizationId" TEXT;

-- Step 2: backfill organizationId from the parent Proposal (every checklist
-- item belongs to a proposal that already has an organizationId)
UPDATE "ProposalChecklistItem" ci
SET "organizationId" = p."organizationId"
FROM "Proposal" p
WHERE ci."proposalId" = p.id;

-- Step 3: enforce NOT NULL now that all rows are backfilled
ALTER TABLE "ProposalChecklistItem" ALTER COLUMN "organizationId" SET NOT NULL;

-- Step 4: composite index for tenant-scoped queries
CREATE INDEX "ProposalChecklistItem_organizationId_proposalId_idx"
  ON "ProposalChecklistItem" ("organizationId", "proposalId");

-- Step 5: foreign key to Organization
ALTER TABLE "ProposalChecklistItem"
  ADD CONSTRAINT "ProposalChecklistItem_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: enable Row Level Security for tenant isolation
-- (mirrors packages/db/prisma/rls-policies.sql so production deploys pick it up
-- without requiring the separate psql script)
ALTER TABLE "ProposalChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalChecklistItem" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ProposalChecklistItem"
  USING ("organizationId" = current_setting('app.current_tenant', true));

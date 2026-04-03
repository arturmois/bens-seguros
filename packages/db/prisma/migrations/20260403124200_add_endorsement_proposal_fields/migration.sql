ALTER TYPE "ProposalBoardType" ADD VALUE IF NOT EXISTS 'ENDORSEMENT';

ALTER TABLE "Proposal"
  ADD COLUMN "sourcePolicyId" TEXT,
  ADD COLUMN "endorsementType" TEXT,
  ADD COLUMN "endorsementReason" TEXT,
  ADD COLUMN "sourcePolicySnapshot" JSONB;

CREATE INDEX "Proposal_organizationId_sourcePolicyId_idx"
  ON "Proposal" ("organizationId", "sourcePolicyId");

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_sourcePolicyId_fkey"
  FOREIGN KEY ("sourcePolicyId") REFERENCES "Policy"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- SCRUM-30: Add quote date fields to Proposal
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "coverageStartDate" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "coverageEndDate" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "sentToClientAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "clientResponseAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "quoteValidUntil" TIMESTAMP(3);

-- SCRUM-46: Add PersonType enum and personType field to Client
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PersonType') THEN
        CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'COMPANY');
    END IF;
END
$$;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "personType" "PersonType" NOT NULL DEFAULT 'INDIVIDUAL';

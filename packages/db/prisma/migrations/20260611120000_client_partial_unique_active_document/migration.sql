-- Replace the full unique index on (organizationId, documentHash) with a
-- partial one that only constrains LIVE clients, so a soft-deleted client no
-- longer blocks recreating someone with the same document.
DROP INDEX IF EXISTS "Client_organizationId_documentHash_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Client_org_documentHash_active_uk"
  ON "Client" ("organizationId", "documentHash")
  WHERE "deletedAt" IS NULL;

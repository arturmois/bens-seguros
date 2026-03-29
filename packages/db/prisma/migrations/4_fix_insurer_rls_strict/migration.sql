-- Remove permissive IS NULL escape from Insurer — it doesn't need it (always uses tenantPrisma)
DROP POLICY IF EXISTS tenant_isolation ON "Insurer";
CREATE POLICY tenant_isolation ON "Insurer"
  USING ("organizationId" = current_setting('app.current_tenant', true));

-- Replace single-column organizationId index with composite (organizationId, claimId) on Occurrence
DROP INDEX IF EXISTS "Occurrence_organizationId_idx";
CREATE INDEX "Occurrence_organizationId_claimId_idx" ON "Occurrence"("organizationId", "claimId");

-- RLS for Member (Better Auth queries without tenant context need IS NULL escape)
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Member"
  USING ("organizationId" = current_setting('app.current_tenant', true)
         OR current_setting('app.current_tenant', true) IS NULL);
ALTER TABLE "Member" FORCE ROW LEVEL SECURITY;

-- RLS for Invitation
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invitation"
  USING ("organizationId" = current_setting('app.current_tenant', true)
         OR current_setting('app.current_tenant', true) IS NULL);
ALTER TABLE "Invitation" FORCE ROW LEVEL SECURITY;

-- RLS for Insurer (strict — always queried through tenantPrisma, no IS NULL escape needed)
ALTER TABLE "Insurer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Insurer"
  USING ("organizationId" = current_setting('app.current_tenant', true));
ALTER TABLE "Insurer" FORCE ROW LEVEL SECURITY;

-- RLS for AuditLogArchive
ALTER TABLE "AuditLogArchive" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLogArchive"
  USING ("organizationId" = current_setting('app.current_tenant', true)
         OR current_setting('app.current_tenant', true) IS NULL);
ALTER TABLE "AuditLogArchive" FORCE ROW LEVEL SECURITY;

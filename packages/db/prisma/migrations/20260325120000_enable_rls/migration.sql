-- Enable Row Level Security on all tenant-scoped tables
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Policy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Claim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Endorsement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assistance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy on each table
-- current_setting('app.current_tenant', true) returns NULL if not set, matching 0 rows (safe default)
CREATE POLICY tenant_isolation ON "Client"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Proposal"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Policy"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Claim"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Commission"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Endorsement"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Assistance"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Document"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "Notification"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("organizationId" = current_setting('app.current_tenant', true));

-- Force RLS even for table owner (defense-in-depth)
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Policy" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Claim" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Commission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Endorsement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Assistance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

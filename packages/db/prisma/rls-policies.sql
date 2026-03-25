-- ============================================================================
-- PostgreSQL Row Level Security (RLS) Policies — Reference File
-- ============================================================================
-- This file documents the RLS policies applied to tenant-scoped tables.
-- The actual migration is in: migrations/20260325120000_enable_rls/migration.sql
--
-- How it works:
--   1. Each request sets: SET LOCAL app.current_tenant = '<organizationId>'
--   2. RLS policies compare "organizationId" column against that setting
--   3. If app.current_tenant is not set, current_setting(..., true) returns NULL
--      which matches 0 rows — safe default (deny all)
--
-- Tables with RLS enabled (10):
--   Client, Proposal, Policy, Claim, Commission,
--   Endorsement, Assistance, Document, Notification, AuditLog
--
-- Verify policies are active:
--   SELECT tablename, policyname, permissive, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
-- ============================================================================

-- Enable RLS
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

-- Tenant isolation policies
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

-- Force RLS for table owner too (defense-in-depth)
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

-- ============================================================================
-- To DROP all policies (rollback):
-- ============================================================================
-- DROP POLICY IF EXISTS tenant_isolation ON "Client";
-- DROP POLICY IF EXISTS tenant_isolation ON "Proposal";
-- DROP POLICY IF EXISTS tenant_isolation ON "Policy";
-- DROP POLICY IF EXISTS tenant_isolation ON "Claim";
-- DROP POLICY IF EXISTS tenant_isolation ON "Commission";
-- DROP POLICY IF EXISTS tenant_isolation ON "Endorsement";
-- DROP POLICY IF EXISTS tenant_isolation ON "Assistance";
-- DROP POLICY IF EXISTS tenant_isolation ON "Document";
-- DROP POLICY IF EXISTS tenant_isolation ON "Notification";
-- DROP POLICY IF EXISTS tenant_isolation ON "AuditLog";
--
-- ALTER TABLE "Client" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Proposal" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Policy" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Claim" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Commission" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Endorsement" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Assistance" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Document" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;

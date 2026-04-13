-- ============================================================================
-- PostgreSQL Row Level Security (RLS) Policies — Reference File
-- ============================================================================
-- This file documents the RLS policies applied to tenant-scoped tables.
-- Migrations:
--   migrations/0_init/migration.sql                  — original 10 tables
--   migrations/2_occurrence_tenant_isolation/        — Occurrence
--   migrations/3_add_rls_missing_tables/             — Insurer, Member, Invitation, AuditLogArchive
--   migrations/4_fix_insurer_rls_strict/             — Insurer strict fix + Occurrence composite index
--
-- How it works:
--   1. Each request sets: SET LOCAL app.current_tenant = '<organizationId>'
--   2. RLS policies compare "organizationId" column against that setting
--   3. If app.current_tenant is not set, current_setting(..., true) returns NULL
--      which matches 0 rows — safe default (deny all)
--
-- Tables with RLS enabled (16):
--
--   STRICT policy (no IS NULL escape — always queried through tenantPrisma):
--     Client, Proposal, ProposalChecklistItem, Policy, Claim, Commission,
--     Endorsement, Assistance, Document, Notification, AuditLog,
--     Occurrence, Insurer
--
--   PERMISSIVE policy (with IS NULL escape):
--     Member         — Better Auth queries without tenant context
--     Invitation     — Better Auth queries without tenant context
--     AuditLogArchive — worker batch jobs use global prisma
--
-- Verify policies are active:
--   SELECT tablename, policyname, permissive, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
-- ============================================================================

-- ============================================================================
-- STRICT policies (no IS NULL — always accessed through tenantPrisma)
-- ============================================================================

-- Enable RLS
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Policy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Claim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Endorsement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assistance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Occurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Insurer" ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
-- Each CREATE POLICY is prefixed with DROP POLICY IF EXISTS so this script is
-- fully idempotent. Required because policies may be created inline in Prisma
-- migrations (e.g. 20260411201650_add_checklist_organization_id_rls), and
-- `pnpm db:push:dev` re-runs this file every time.

DROP POLICY IF EXISTS tenant_isolation ON "Client";
CREATE POLICY tenant_isolation ON "Client"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Proposal";
CREATE POLICY tenant_isolation ON "Proposal"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "ProposalChecklistItem";
CREATE POLICY tenant_isolation ON "ProposalChecklistItem"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Policy";
CREATE POLICY tenant_isolation ON "Policy"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Claim";
CREATE POLICY tenant_isolation ON "Claim"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Commission";
CREATE POLICY tenant_isolation ON "Commission"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Endorsement";
CREATE POLICY tenant_isolation ON "Endorsement"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Assistance";
CREATE POLICY tenant_isolation ON "Assistance"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Document";
CREATE POLICY tenant_isolation ON "Document"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Notification";
CREATE POLICY tenant_isolation ON "Notification"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "AuditLog";
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Occurrence";
CREATE POLICY tenant_isolation ON "Occurrence"
  USING ("organizationId" = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS tenant_isolation ON "Insurer";
CREATE POLICY tenant_isolation ON "Insurer"
  USING ("organizationId" = current_setting('app.current_tenant', true));

-- Force RLS for table owner too (defense-in-depth)
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProposalChecklistItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Policy" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Claim" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Commission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Endorsement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Assistance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Occurrence" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Insurer" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- PERMISSIVE policies (with IS NULL escape)
-- ============================================================================
-- These tables are accessed by Better Auth or background workers that operate
-- without a tenant context (app.current_tenant not set).
-- IS NULL allows those queries through while still filtering by tenant when set.

-- Member — Better Auth queries without tenant context
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Member";
CREATE POLICY tenant_isolation ON "Member"
  USING ("organizationId" = current_setting('app.current_tenant', true)
         OR current_setting('app.current_tenant', true) IS NULL);
ALTER TABLE "Member" FORCE ROW LEVEL SECURITY;

-- Invitation — Better Auth queries without tenant context
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Invitation";
CREATE POLICY tenant_isolation ON "Invitation"
  USING ("organizationId" = current_setting('app.current_tenant', true)
         OR current_setting('app.current_tenant', true) IS NULL);
ALTER TABLE "Invitation" FORCE ROW LEVEL SECURITY;

-- AuditLogArchive — audit archive worker uses global prisma (batch jobs)
ALTER TABLE "AuditLogArchive" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AuditLogArchive";
CREATE POLICY tenant_isolation ON "AuditLogArchive"
  USING ("organizationId" = current_setting('app.current_tenant', true)
         OR current_setting('app.current_tenant', true) IS NULL);
ALTER TABLE "AuditLogArchive" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANTS for app_user (non-superuser runtime role)
-- ============================================================================
-- After `prisma db push` or `prisma migrate deploy`, tables are owned by the
-- admin user (bens_prod). The app_user role needs explicit GRANT to access them.
-- These statements are idempotent (safe to re-run).

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Ensure future tables created by the admin user also grant access to app_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- ============================================================================
-- To DROP all policies (rollback):
-- ============================================================================
-- DROP POLICY IF EXISTS tenant_isolation ON "Client";
-- DROP POLICY IF EXISTS tenant_isolation ON "Proposal";
-- DROP POLICY IF EXISTS tenant_isolation ON "ProposalChecklistItem";
-- DROP POLICY IF EXISTS tenant_isolation ON "Policy";
-- DROP POLICY IF EXISTS tenant_isolation ON "Claim";
-- DROP POLICY IF EXISTS tenant_isolation ON "Commission";
-- DROP POLICY IF EXISTS tenant_isolation ON "Endorsement";
-- DROP POLICY IF EXISTS tenant_isolation ON "Assistance";
-- DROP POLICY IF EXISTS tenant_isolation ON "Document";
-- DROP POLICY IF EXISTS tenant_isolation ON "Notification";
-- DROP POLICY IF EXISTS tenant_isolation ON "AuditLog";
-- DROP POLICY IF EXISTS tenant_isolation ON "Occurrence";
-- DROP POLICY IF EXISTS tenant_isolation ON "Insurer";
-- DROP POLICY IF EXISTS tenant_isolation ON "Member";
-- DROP POLICY IF EXISTS tenant_isolation ON "Invitation";
-- DROP POLICY IF EXISTS tenant_isolation ON "AuditLogArchive";
--
-- ALTER TABLE "Client" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Proposal" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "ProposalChecklistItem" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Policy" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Claim" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Commission" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Endorsement" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Assistance" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Document" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Occurrence" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Insurer" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Member" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Invitation" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "AuditLogArchive" DISABLE ROW LEVEL SECURITY;

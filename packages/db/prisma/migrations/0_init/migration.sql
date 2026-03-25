-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AssistanceStatus" AS ENUM ('REQUESTED', 'AWAITING_DOCUMENT', 'PENDING_INSPECTION', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ClaimPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ClaimStatus" AS ENUM ('REGISTERED', 'IN_ANALYSIS', 'AWAITING_DOCUMENT', 'PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'PAID', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ClientType" AS ENUM ('LEAD', 'CLIENT', 'FORMER_CLIENT');

-- CreateEnum
CREATE TYPE "public"."CommissionStatus" AS ENUM ('PENDING_COMMERCIAL', 'PENDING_ADMIN', 'APPROVED', 'PAID', 'REJECTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "public"."DocumentEntityType" AS ENUM ('CLIENT', 'PROPOSAL', 'POLICY', 'CLAIM', 'ASSISTANCE');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('DRIVER_LICENSE', 'VEHICLE_REGISTRATION', 'POLICY_PDF', 'CLAIM_PHOTO', 'CLAIM_REPORT', 'PROOF_OF_PAYMENT', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InsuranceBranch" AS ENUM ('AUTO', 'RESIDENTIAL', 'CONDOMINIUM', 'BUSINESS', 'LIFE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PolicyStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ProposalBoardType" AS ENUM ('NEW_INSURANCE', 'RENEWAL');

-- CreateEnum
CREATE TYPE "public"."ProposalStage" AS ENUM ('CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT', 'POLICY_ISSUED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Assistance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "claimId" TEXT,
    "type" TEXT NOT NULL,
    "status" "public"."AssistanceStatus" NOT NULL DEFAULT 'REQUESTED',
    "description" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "providerName" TEXT,
    "providerPhone" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assistance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLogArchive" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Claim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claimNumber" INTEGER NOT NULL,
    "policyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "insurerId" TEXT,
    "assignedToId" TEXT,
    "status" "public"."ClaimStatus" NOT NULL DEFAULT 'REGISTERED',
    "priority" "public"."ClaimPriority" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3),
    "incidentLocation" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "type" "public"."ClientType" NOT NULL DEFAULT 'LEAD',
    "email" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "profession" TEXT,
    "maritalStatus" "public"."MaritalStatus",
    "address" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consentLgpd" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Commission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "status" "public"."CommissionStatus" NOT NULL DEFAULT 'PENDING_COMMERCIAL',
    "commissionValueInCents" INTEGER NOT NULL,
    "premiumValueInCents" INTEGER NOT NULL,
    "percentageInBasisPoints" INTEGER NOT NULL,
    "splitPercentage" INTEGER DEFAULT 10000,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "originalCommissionId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "public"."DocumentEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "clientId" TEXT,
    "type" "public"."DocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Endorsement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "previousVersionSnapshot" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Insurer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'COMMERCIAL',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'COMMERCIAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "commissionSplitPercentage" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Occurrence" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Policy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "insurerId" TEXT,
    "policyNumber" TEXT NOT NULL,
    "status" "public"."PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "branch" "public"."InsuranceBranch" NOT NULL,
    "premiumValueInCents" INTEGER NOT NULL,
    "coverageDetails" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "stage" "public"."ProposalStage" NOT NULL DEFAULT 'CAPTURE',
    "boardType" "public"."ProposalBoardType" NOT NULL DEFAULT 'NEW_INSURANCE',
    "branch" "public"."InsuranceBranch" NOT NULL DEFAULT 'OTHER',
    "premiumValueInCents" INTEGER NOT NULL DEFAULT 0,
    "commissionPercentageInCents" INTEGER NOT NULL DEFAULT 0,
    "lostReason" TEXT,
    "renewalPolicyId" TEXT,
    "insurerId" TEXT,
    "details" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProposalChecklistItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "activeOrganizationId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId" ASC);

-- CreateIndex
CREATE INDEX "Assistance_organizationId_createdAt_idx" ON "public"."Assistance"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Assistance_organizationId_status_idx" ON "public"."Assistance"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_action_idx" ON "public"."AuditLog"("organizationId" ASC, "action" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_createdAt_idx" ON "public"."AuditLog"("organizationId" ASC, "entityType" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_userId_idx" ON "public"."AuditLog"("organizationId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "AuditLogArchive_organizationId_createdAt_idx" ON "public"."AuditLogArchive"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Claim_organizationId_claimNumber_key" ON "public"."Claim"("organizationId" ASC, "claimNumber" ASC);

-- CreateIndex
CREATE INDEX "Claim_organizationId_createdAt_idx" ON "public"."Claim"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Claim_organizationId_policyId_idx" ON "public"."Claim"("organizationId" ASC, "policyId" ASC);

-- CreateIndex
CREATE INDEX "Claim_organizationId_priority_idx" ON "public"."Claim"("organizationId" ASC, "priority" ASC);

-- CreateIndex
CREATE INDEX "Claim_organizationId_status_idx" ON "public"."Claim"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Client_organizationId_createdAt_idx" ON "public"."Client"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Client_organizationId_document_key" ON "public"."Client"("organizationId" ASC, "document" ASC);

-- CreateIndex
CREATE INDEX "Client_organizationId_type_idx" ON "public"."Client"("organizationId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "Commission_organizationId_createdAt_idx" ON "public"."Commission"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Commission_organizationId_policyId_idx" ON "public"."Commission"("organizationId" ASC, "policyId" ASC);

-- CreateIndex
CREATE INDEX "Commission_organizationId_salespersonId_idx" ON "public"."Commission"("organizationId" ASC, "salespersonId" ASC);

-- CreateIndex
CREATE INDEX "Commission_organizationId_status_idx" ON "public"."Commission"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Document_organizationId_createdAt_idx" ON "public"."Document"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Document_organizationId_entityType_entityId_idx" ON "public"."Document"("organizationId" ASC, "entityType" ASC, "entityId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "public"."Document"("storageKey" ASC);

-- CreateIndex
CREATE INDEX "Endorsement_organizationId_createdAt_idx" ON "public"."Endorsement"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Endorsement_organizationId_policyId_idx" ON "public"."Endorsement"("organizationId" ASC, "policyId" ASC);

-- CreateIndex
CREATE INDEX "Insurer_organizationId_idx" ON "public"."Insurer"("organizationId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Insurer_organizationId_name_key" ON "public"."Insurer"("organizationId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "public"."Invitation"("email" ASC);

-- CreateIndex
CREATE INDEX "Invitation_organizationId_idx" ON "public"."Invitation"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "Member_organizationId_idx" ON "public"."Member"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "Member_organizationId_role_idx" ON "public"."Member"("organizationId" ASC, "role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "public"."Member"("organizationId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "public"."Member"("userId" ASC);

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "public"."Notification"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_read_idx" ON "public"."Notification"("organizationId" ASC, "userId" ASC, "read" ASC);

-- CreateIndex
CREATE INDEX "Occurrence_claimId_idx" ON "public"."Occurrence"("claimId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "public"."Organization"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug" ASC);

-- CreateIndex
CREATE INDEX "Policy_organizationId_createdAt_idx" ON "public"."Policy"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Policy_organizationId_endDate_idx" ON "public"."Policy"("organizationId" ASC, "endDate" ASC);

-- CreateIndex
CREATE INDEX "Policy_organizationId_insurerId_idx" ON "public"."Policy"("organizationId" ASC, "insurerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Policy_organizationId_policyNumber_key" ON "public"."Policy"("organizationId" ASC, "policyNumber" ASC);

-- CreateIndex
CREATE INDEX "Policy_organizationId_status_idx" ON "public"."Policy"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Policy_proposalId_key" ON "public"."Policy"("proposalId" ASC);

-- CreateIndex
CREATE INDEX "Proposal_organizationId_clientId_idx" ON "public"."Proposal"("organizationId" ASC, "clientId" ASC);

-- CreateIndex
CREATE INDEX "Proposal_organizationId_createdAt_idx" ON "public"."Proposal"("organizationId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Proposal_organizationId_insurerId_idx" ON "public"."Proposal"("organizationId" ASC, "insurerId" ASC);

-- CreateIndex
CREATE INDEX "Proposal_organizationId_salespersonId_idx" ON "public"."Proposal"("organizationId" ASC, "salespersonId" ASC);

-- CreateIndex
CREATE INDEX "Proposal_organizationId_stage_idx" ON "public"."Proposal"("organizationId" ASC, "stage" ASC);

-- CreateIndex
CREATE INDEX "ProposalChecklistItem_proposalId_idx" ON "public"."ProposalChecklistItem"("proposalId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProposalChecklistItem_proposalId_itemKey_key" ON "public"."ProposalChecklistItem"("proposalId" ASC, "itemKey" ASC);

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assistance" ADD CONSTRAINT "Assistance_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assistance" ADD CONSTRAINT "Assistance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assistance" ADD CONSTRAINT "Assistance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Claim" ADD CONSTRAINT "Claim_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Claim" ADD CONSTRAINT "Claim_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Claim" ADD CONSTRAINT "Claim_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "public"."Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Claim" ADD CONSTRAINT "Claim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_originalCommissionId_fkey" FOREIGN KEY ("originalCommissionId") REFERENCES "public"."Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Endorsement" ADD CONSTRAINT "Endorsement_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Occurrence" ADD CONSTRAINT "Occurrence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "public"."Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "public"."Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_renewalPolicyId_fkey" FOREIGN KEY ("renewalPolicyId") REFERENCES "public"."Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProposalChecklistItem" ADD CONSTRAINT "ProposalChecklistItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


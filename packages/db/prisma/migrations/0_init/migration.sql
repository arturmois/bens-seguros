
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('LEAD', 'CLIENT', 'FORMER_CLIENT');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER');

-- CreateEnum
CREATE TYPE "ProposalStage" AS ENUM ('CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT', 'POLICY_ISSUED', 'LOST');

-- CreateEnum
CREATE TYPE "ProposalBoardType" AS ENUM ('NEW_INSURANCE', 'RENEWAL', 'ENDORSEMENT');

-- CreateEnum
CREATE TYPE "InsuranceBranch" AS ENUM ('AUTO', 'RESIDENTIAL', 'CONDOMINIUM', 'BUSINESS', 'LIFE', 'OTHER');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('REGISTERED', 'IN_ANALYSIS', 'AWAITING_DOCUMENT', 'PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'PAID', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClaimPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AssistanceStatus" AS ENUM ('REQUESTED', 'AWAITING_DOCUMENT', 'PENDING_INSPECTION', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DocumentEntityType" AS ENUM ('CLIENT', 'PROPOSAL', 'POLICY', 'CLAIM', 'ASSISTANCE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRIVER_LICENSE', 'VEHICLE_REGISTRATION', 'HEALTH_DECLARATION', 'PROOF_OF_ADDRESS', 'SOCIAL_CONTRACT', 'CNPJ_CARD', 'POLICY_PDF', 'QUOTATION_PDF', 'CLAIM_PHOTO', 'CLAIM_REPORT', 'PROOF_OF_PAYMENT', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING_COMMERCIAL', 'PENDING_ADMIN', 'APPROVED', 'PAID', 'REJECTED', 'REVERSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedTermsAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "privacyVersion" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
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
CREATE TABLE "Account" (
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
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
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
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COMMERCIAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "commissionSplitPercentage" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COMMERCIAL',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "documentEncrypted" TEXT NOT NULL DEFAULT '',
    "documentHash" TEXT NOT NULL DEFAULT '',
    "type" "ClientType" NOT NULL DEFAULT 'LEAD',
    "personType" "PersonType" NOT NULL DEFAULT 'INDIVIDUAL',
    "email" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "profession" TEXT,
    "maritalStatus" "MaritalStatus",
    "address" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialMedia" JSONB,
    "consentLgpd" BOOLEAN NOT NULL DEFAULT false,
    "salespersonId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "stage" "ProposalStage" NOT NULL DEFAULT 'CAPTURE',
    "boardType" "ProposalBoardType" NOT NULL DEFAULT 'NEW_INSURANCE',
    "branch" "InsuranceBranch" NOT NULL DEFAULT 'OTHER',
    "premiumValueInCents" INTEGER NOT NULL DEFAULT 0,
    "commissionPercentageInCents" INTEGER NOT NULL DEFAULT 0,
    "lostReason" TEXT,
    "renewalPolicyId" TEXT,
    "sourcePolicyId" TEXT,
    "endorsementType" TEXT,
    "endorsementReason" TEXT,
    "sourcePolicySnapshot" JSONB,
    "insurerId" TEXT,
    "coverageStartDate" TIMESTAMP(3),
    "coverageEndDate" TIMESTAMP(3),
    "sentToClientAt" TIMESTAMP(3),
    "clientResponseAt" TIMESTAMP(3),
    "quoteValidUntil" TIMESTAMP(3),
    "details" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalChecklistItem" (
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
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "insurerId" TEXT,
    "policyNumber" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "branch" "InsuranceBranch" NOT NULL,
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
CREATE TABLE "Insurer" (
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
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claimNumber" INTEGER NOT NULL,
    "policyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "insurerId" TEXT,
    "assignedToId" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'REGISTERED',
    "priority" "ClaimPriority" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT NOT NULL,
    "estimatedValueInCents" INTEGER,
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
CREATE TABLE "Occurrence" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endorsement" (
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
CREATE TABLE "Assistance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "claimId" TEXT,
    "type" TEXT NOT NULL,
    "status" "AssistanceStatus" NOT NULL DEFAULT 'REQUESTED',
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
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "DocumentEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "clientId" TEXT,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
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
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING_COMMERCIAL',
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
CREATE TABLE "Notification" (
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
CREATE TABLE "AuditLog" (
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
CREATE TABLE "AuditLogArchive" (
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "TermsAcceptance_userId_idx" ON "TermsAcceptance"("userId");

-- CreateIndex
CREATE INDEX "TermsAcceptance_userId_type_idx" ON "TermsAcceptance"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Member_organizationId_idx" ON "Member"("organizationId");

-- CreateIndex
CREATE INDEX "Member_organizationId_role_idx" ON "Member"("organizationId", "role");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "Member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Client_organizationId_type_idx" ON "Client"("organizationId", "type");

-- CreateIndex
CREATE INDEX "Client_organizationId_createdAt_idx" ON "Client"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Client_organizationId_salespersonId_idx" ON "Client"("organizationId", "salespersonId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_organizationId_documentHash_key" ON "Client"("organizationId", "documentHash");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_stage_idx" ON "Proposal"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_clientId_idx" ON "Proposal"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_salespersonId_idx" ON "Proposal"("organizationId", "salespersonId");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_insurerId_idx" ON "Proposal"("organizationId", "insurerId");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_sourcePolicyId_idx" ON "Proposal"("organizationId", "sourcePolicyId");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_boardType_createdAt_idx" ON "Proposal"("organizationId", "boardType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Proposal_organizationId_createdAt_idx" ON "Proposal"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProposalChecklistItem_proposalId_idx" ON "ProposalChecklistItem"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalChecklistItem_proposalId_itemKey_key" ON "ProposalChecklistItem"("proposalId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_proposalId_key" ON "Policy"("proposalId");

-- CreateIndex
CREATE INDEX "Policy_organizationId_insurerId_idx" ON "Policy"("organizationId", "insurerId");

-- CreateIndex
CREATE INDEX "Policy_organizationId_status_idx" ON "Policy"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Policy_organizationId_endDate_idx" ON "Policy"("organizationId", "endDate");

-- CreateIndex
CREATE INDEX "Policy_organizationId_createdAt_idx" ON "Policy"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Policy_organizationId_policyNumber_key" ON "Policy"("organizationId", "policyNumber");

-- CreateIndex
CREATE INDEX "Insurer_organizationId_idx" ON "Insurer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Insurer_organizationId_name_key" ON "Insurer"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Claim_organizationId_status_idx" ON "Claim"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Claim_organizationId_policyId_idx" ON "Claim"("organizationId", "policyId");

-- CreateIndex
CREATE INDEX "Claim_organizationId_priority_idx" ON "Claim"("organizationId", "priority");

-- CreateIndex
CREATE INDEX "Claim_organizationId_createdAt_idx" ON "Claim"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Claim_organizationId_claimNumber_key" ON "Claim"("organizationId", "claimNumber");

-- CreateIndex
CREATE INDEX "Occurrence_claimId_idx" ON "Occurrence"("claimId");

-- CreateIndex
CREATE INDEX "Occurrence_organizationId_claimId_idx" ON "Occurrence"("organizationId", "claimId");

-- CreateIndex
CREATE INDEX "Endorsement_organizationId_policyId_idx" ON "Endorsement"("organizationId", "policyId");

-- CreateIndex
CREATE INDEX "Endorsement_organizationId_createdAt_idx" ON "Endorsement"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Assistance_organizationId_status_idx" ON "Assistance"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Assistance_organizationId_createdAt_idx" ON "Assistance"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_organizationId_entityType_entityId_idx" ON "Document"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Commission_organizationId_status_idx" ON "Commission"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Commission_organizationId_salespersonId_idx" ON "Commission"("organizationId", "salespersonId");

-- CreateIndex
CREATE INDEX "Commission_organizationId_policyId_idx" ON "Commission"("organizationId", "policyId");

-- CreateIndex
CREATE INDEX "Commission_organizationId_createdAt_idx" ON "Commission"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_read_idx" ON "Notification"("organizationId", "userId", "read");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_organizationId_entityType_entityId_type_create_idx" ON "Notification"("organizationId", "entityType", "entityId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_createdAt_idx" ON "AuditLog"("organizationId", "entityType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_action_idx" ON "AuditLog"("organizationId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_userId_idx" ON "AuditLog"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "AuditLogArchive_organizationId_createdAt_idx" ON "AuditLogArchive"("organizationId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_renewalPolicyId_fkey" FOREIGN KEY ("renewalPolicyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_sourcePolicyId_fkey" FOREIGN KEY ("sourcePolicyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalChecklistItem" ADD CONSTRAINT "ProposalChecklistItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistance" ADD CONSTRAINT "Assistance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistance" ADD CONSTRAINT "Assistance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistance" ADD CONSTRAINT "Assistance_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_originalCommissionId_fkey" FOREIGN KEY ("originalCommissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


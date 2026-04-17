-- CreateIndex
CREATE INDEX "AuditLog_organizationId_userId_createdAt_idx" ON "AuditLog"("organizationId", "userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_createdAt_idx" ON "Notification"("organizationId", "userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Proposal_organizationId_stage_updatedAt_idx" ON "Proposal"("organizationId", "stage", "updatedAt" DESC);

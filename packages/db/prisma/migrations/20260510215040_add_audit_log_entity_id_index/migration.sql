-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_entityId_createdAt_idx" ON "AuditLog"("organizationId", "entityType", "entityId", "createdAt" DESC);

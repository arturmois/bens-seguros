-- DropIndex
DROP INDEX "Client_organizationId_document_key";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "documentEncrypted" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "documentHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "salespersonId" TEXT;

-- CreateIndex
CREATE INDEX "Client_organizationId_salespersonId_idx" ON "Client"("organizationId", "salespersonId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_organizationId_documentHash_key" ON "Client"("organizationId", "documentHash");

-- CreateIndex
CREATE INDEX "Notification_organizationId_entityType_entityId_type_create_idx" ON "Notification"("organizationId", "entityType", "entityId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

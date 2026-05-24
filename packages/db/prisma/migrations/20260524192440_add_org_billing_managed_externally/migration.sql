-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingManagedExternally" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "externalNotes" TEXT;

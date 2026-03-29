-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'QUOTATION_PDF';

-- DropForeignKey
ALTER TABLE "TermsAcceptance" DROP CONSTRAINT "TermsAcceptance_userId_fkey";

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "estimatedValueInCents" INTEGER;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

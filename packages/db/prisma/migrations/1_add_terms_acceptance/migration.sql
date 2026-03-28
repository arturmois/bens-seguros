-- AlterTable
ALTER TABLE "User" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "privacyVersion" TEXT;

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

-- CreateIndex
CREATE INDEX "TermsAcceptance_userId_idx" ON "TermsAcceptance"("userId");

-- CreateIndex
CREATE INDEX "TermsAcceptance_userId_type_idx" ON "TermsAcceptance"("userId", "type");

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

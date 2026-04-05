-- Mark all existing users as email-verified before enabling requireEmailVerification.
-- Without this, all existing users would be locked out of their accounts.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;

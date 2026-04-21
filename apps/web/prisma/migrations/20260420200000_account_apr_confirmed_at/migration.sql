-- Add columns the Prisma schema already declares but no prior migration has
-- applied: apr_confirmed_at records when the user confirmed the APR on a
-- given debt account, and custom_label stores a user-defined display label
-- for the account. Both are nullable. Uses IF NOT EXISTS so this migration
-- is idempotent for environments where the columns were created previously
-- via `prisma db push`.
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "apr_confirmed_at" TIMESTAMP(3);
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "custom_label" TEXT;

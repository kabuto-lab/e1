ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_hash" varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_hash_idx" ON "users" ("phone_hash") WHERE "phone_hash" IS NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_staff_credentials_check";
ALTER TABLE "users" ADD CONSTRAINT "users_staff_credentials_check"
  CHECK (role IN ('client','model') OR (password_hash IS NOT NULL AND (email_hash IS NOT NULL OR phone_hash IS NOT NULL)));

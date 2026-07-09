ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email") WHERE "email" IS NOT NULL;

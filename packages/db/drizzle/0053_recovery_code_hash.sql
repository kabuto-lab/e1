CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recovery_code_hash" varchar(255);--> statement-breakpoint
UPDATE "users" SET "recovery_code_hash" = crypt("recovery_code", gen_salt('bf', 10)) WHERE "recovery_code" IS NOT NULL AND "recovery_code_hash" IS NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "users_recovery_code_unique_nonnull";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "recovery_code";

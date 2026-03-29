DROP INDEX IF EXISTS "model_user_unique";--> statement-breakpoint
ALTER TABLE "model_profiles" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "model_user_unique_nonnull" ON "model_profiles" ("user_id") WHERE "user_id" IS NOT NULL;

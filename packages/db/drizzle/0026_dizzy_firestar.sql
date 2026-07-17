ALTER TABLE "users" ADD COLUMN "initial_password" varchar(64);--> statement-breakpoint
DROP INDEX IF EXISTS "model_user_unique_nonnull";--> statement-breakpoint
ALTER TABLE "model_profiles" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "model_user_unique" ON "model_profiles" USING btree ("user_id");

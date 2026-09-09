ALTER TABLE "model_profiles" RENAME COLUMN "telegram_operator_user_id" TO "curator_user_id";--> statement-breakpoint
ALTER TABLE "model_profiles" DROP CONSTRAINT "model_profiles_telegram_operator_user_id_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_curator_user_id_users_id_fk" FOREIGN KEY ("curator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

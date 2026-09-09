ALTER TABLE "model_profiles" ADD COLUMN "telegram_operator_user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_telegram_operator_user_id_users_id_fk" FOREIGN KEY ("telegram_operator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

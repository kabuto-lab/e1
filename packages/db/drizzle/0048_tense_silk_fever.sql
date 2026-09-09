ALTER TABLE "model_profiles" RENAME COLUMN "curator_user_id" TO "operator_user_id";--> statement-breakpoint
ALTER TABLE "model_profiles" DROP CONSTRAINT "model_profiles_curator_user_id_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_operator_user_id_users_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

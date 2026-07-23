ALTER TABLE "bookings" DROP CONSTRAINT "bookings_model_id_model_profiles_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_model_id_model_profiles_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "bookings" ADD COLUMN "proposed_start_time" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "proposed_by_user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

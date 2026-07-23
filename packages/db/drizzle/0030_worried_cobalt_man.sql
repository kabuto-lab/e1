ALTER TABLE "client_profiles" DROP CONSTRAINT "client_profiles_assigned_manager_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "model_profiles" DROP CONSTRAINT "model_profiles_manager_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_manager_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_proposed_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_cancelled_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "escrow_audit_events" DROP CONSTRAINT "escrow_audit_events_actor_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blacklists" DROP CONSTRAINT "blacklists_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blacklists" DROP CONSTRAINT "blacklists_restored_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "media_files" DROP CONSTRAINT "media_files_moderated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "booking_audit_logs" DROP CONSTRAINT "booking_audit_logs_actor_id_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_assigned_manager_id_users_id_fk" FOREIGN KEY ("assigned_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escrow_audit_events" ADD CONSTRAINT "escrow_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklists" ADD CONSTRAINT "blacklists_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklists" ADD CONSTRAINT "blacklists_restored_by_users_id_fk" FOREIGN KEY ("restored_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_files" ADD CONSTRAINT "media_files_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

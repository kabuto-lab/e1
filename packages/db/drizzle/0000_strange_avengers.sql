CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hash" varchar(64) NOT NULL,
	"phone_token" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'client' NOT NULL,
	"status" varchar(30) DEFAULT 'pending_verification' NOT NULL,
	"clerk_id" varchar(255),
	"last_login" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_hash_unique" UNIQUE("email_hash"),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trust_score" numeric(3, 2) DEFAULT '0.00',
	"vip_tier" varchar(20) DEFAULT 'standard',
	"psychotype" varchar(30),
	"archetypes" jsonb,
	"preferences" jsonb,
	"total_bookings" integer DEFAULT 0,
	"successful_meetings" integer DEFAULT 0,
	"cancellation_rate" numeric(4, 2) DEFAULT '0.00',
	"blacklist_status" varchar(20) DEFAULT 'clear',
	"blacklist_reason" text,
	"assigned_manager_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"manager_id" uuid,
	"display_name" varchar(100) NOT NULL,
	"slug" varchar(100),
	"verification_status" varchar(30) DEFAULT 'pending',
	"verification_completed_at" timestamp,
	"last_video_verification" timestamp,
	"elite_status" boolean DEFAULT false,
	"rate_hourly" numeric(10, 2),
	"rate_overnight" numeric(10, 2),
	"availability_status" varchar(30) DEFAULT 'offline',
	"next_available_at" timestamp,
	"psychotype_tags" jsonb,
	"languages" jsonb,
	"physical_attributes" jsonb,
	"rating_reliability" numeric(3, 2) DEFAULT '0.00',
	"total_meetings" integer DEFAULT 0,
	"total_cancellations" integer DEFAULT 0,
	"cancellations_last_3_months" integer DEFAULT 0,
	"photo_count" integer DEFAULT 0,
	"video_walkthrough_url" varchar(500),
	"video_verification_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"manager_id" uuid,
	"status" varchar(30) DEFAULT 'draft',
	"start_time" timestamp NOT NULL,
	"duration_hours" integer NOT NULL,
	"location_type" varchar(20),
	"special_requests" text,
	"total_amount" numeric(12, 2) NOT NULL,
	"platform_fee" numeric(12, 2),
	"model_payout" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'RUB',
	"cancellation_reason" text,
	"cancelled_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escrow_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"payment_provider" varchar(30),
	"payment_provider_ref" varchar(255),
	"amount_held" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RUB',
	"status" varchar(40) DEFAULT 'pending_funding',
	"funded_at" timestamp,
	"hold_until" timestamp,
	"released_at" timestamp,
	"refunded_at" timestamp,
	"release_trigger" varchar(50),
	"state_history" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "escrow_transactions_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"is_public" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"moderation_status" varchar(20) DEFAULT 'pending',
	"moderation_reason" text,
	"helpful_count" integer DEFAULT 0,
	"not_helpful_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blacklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(10) NOT NULL,
	"entity_id" uuid NOT NULL,
	"reason" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'blocked',
	"blocked_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"restored_by" uuid,
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"restored_at" timestamp,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"model_id" uuid,
	"file_type" varchar(20) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer,
	"storage_key" varchar(500) NOT NULL,
	"cdn_url" varchar(500),
	"is_verified" boolean DEFAULT false,
	"verification_date" timestamp,
	"metadata" jsonb,
	"moderation_status" varchar(20) DEFAULT 'pending',
	"moderation_reason" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" uuid,
	"from_status" varchar(30),
	"to_status" varchar(30),
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"access_token_hash" varchar(255),
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_assigned_manager_id_users_id_fk" FOREIGN KEY ("assigned_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_model_id_model_profiles_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_model_id_model_profiles_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklists" ADD CONSTRAINT "blacklists_blocked_by_users_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklists" ADD CONSTRAINT "blacklists_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklists" ADD CONSTRAINT "blacklists_restored_by_users_id_fk" FOREIGN KEY ("restored_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_files" ADD CONSTRAINT "media_files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_files" ADD CONSTRAINT "media_files_model_id_model_profiles_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_hash_idx" ON "users" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "client_user_unique" ON "client_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_manager_idx" ON "client_profiles" USING btree ("assigned_manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_vip_idx" ON "client_profiles" USING btree ("vip_tier");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "model_user_unique" ON "model_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_manager_idx" ON "model_profiles" USING btree ("manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "model_slug_unique" ON "model_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_status_idx" ON "model_profiles" USING btree ("availability_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_elite_idx" ON "model_profiles" USING btree ("elite_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_verification_idx" ON "model_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_client_idx" ON "bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_model_idx" ON "bookings" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_manager_idx" ON "bookings" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_start_time_idx" ON "bookings" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_booking_idx" ON "escrow_transactions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_status_idx" ON "escrow_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_funded_at_idx" ON "escrow_transactions" USING btree ("funded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_model_idx" ON "reviews" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_client_idx" ON "reviews" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "review_booking_unique" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_rating_idx" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blacklist_entity_idx" ON "blacklists" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blacklist_status_idx" ON "blacklists" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blacklist_reason_idx" ON "blacklists" USING btree ("reason");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_owner_idx" ON "media_files" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_model_idx" ON "media_files" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_type_idx" ON "media_files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_verified_idx" ON "media_files" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_booking_idx" ON "booking_audit_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "booking_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "booking_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_created_at_idx" ON "booking_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_token_idx" ON "sessions" USING btree ("refresh_token_hash");
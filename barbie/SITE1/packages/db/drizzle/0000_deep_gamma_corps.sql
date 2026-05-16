CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_name" varchar(500),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"plan_id" uuid,
	"primary_domain" varchar(255),
	"contact_email" varchar(320) NOT NULL,
	"contact_phone" varchar(32),
	"timezone" varchar(64) DEFAULT 'Europe/Moscow' NOT NULL,
	"locale" varchar(8) DEFAULT 'ru' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_format_check" CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(32),
	"email_verified_at" timestamp,
	"phone_verified_at" timestamp,
	"status" varchar(20) DEFAULT 'pending_verification' NOT NULL,
	"locale" varchar(8) DEFAULT 'ru' NOT NULL,
	"last_login_at" timestamp,
	"last_login_ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_format_check" CHECK (email ~ '^[^@s]+@[^@s]+.[^@s]+$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(32) DEFAULT 'platform-admin' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(128) NOT NULL,
	"region" varchar(128),
	"country" varchar(2) DEFAULT 'RU' NOT NULL,
	"postal_code" varchar(16),
	"geo_lat" numeric(9, 6),
	"geo_lng" numeric(9, 6),
	"phone" varchar(32),
	"email" varchar(320),
	"working_hours" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"cover_image_key" varchar(500),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(32) NOT NULL,
	"salon_id" uuid,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_users_salon_required_check" CHECK ((role IN ('tenant-admin','client') OR salon_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_design_tokens" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"bg" varchar(16) DEFAULT '#FFFFFF' NOT NULL,
	"head_color" varchar(16) DEFAULT '#0A0A0A' NOT NULL,
	"head_font" varchar(64) DEFAULT 'Unbounded' NOT NULL,
	"acc_color" varchar(16) DEFAULT '#D4AF37' NOT NULL,
	"acc_font" varchar(64) DEFAULT 'Unbounded' NOT NULL,
	"body_color" varchar(16) DEFAULT '#1A1A1A' NOT NULL,
	"body_font" varchar(64) DEFAULT 'Inter' NOT NULL,
	"logo_key" varchar(500),
	"logo_alt" varchar(255),
	"favicon_key" varchar(500),
	"nav_template" varchar(32) DEFAULT 'top-classic' NOT NULL,
	"custom_css" text,
	"extras" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_design_tokens_nav_template_check" CHECK (nav_template IN ('top-classic','mega-images','vertical-side')),
	CONSTRAINT "tenant_design_tokens_colors_hex_check" CHECK (bg ~ '^#[0-9A-Fa-f]{6,8}$' AND head_color ~ '^#[0-9A-Fa-f]{6,8}$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_id" uuid,
	"label" varchar(255) NOT NULL,
	"href" varchar(1000) NOT NULL,
	"image_key" varchar(500),
	"icon" varchar(64),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"locale" varchar(8) DEFAULT 'ru' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_menu_items_href_check" CHECK (href ~ '^(/|https?://)')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"salon_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"category" varchar(64) NOT NULL,
	"duration_min" integer NOT NULL,
	"price_kopecks" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'RUB' NOT NULL,
	"cover_image_key" varchar(500),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_duration_check" CHECK (duration_min > 0 AND duration_min <= 1440),
	CONSTRAINT "services_price_check" CHECK (price_kopecks >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"salon_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"bio" text,
	"photo_key" varchar(500),
	"specialties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schedule" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_services" (
	"staff_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"price_override_kopecks" bigint,
	"duration_override_min" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_services_staff_id_service_id_pk" PRIMARY KEY("staff_id","service_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(320),
	"birthdate" date,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"first_visit_at" timestamp,
	"last_visit_at" timestamp,
	"total_spent_kopecks" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"salon_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"starts_at" timestamp NOT NULL,
	"duration_min" integer NOT NULL,
	"ends_at" timestamp NOT NULL,
	"price_kopecks" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'RUB' NOT NULL,
	"status" varchar(20) DEFAULT 'booked' NOT NULL,
	"source" varchar(16) DEFAULT 'web' NOT NULL,
	"notes" text,
	"cancellation_reason" text,
	"idempotency_key" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_duration_check" CHECK (duration_min > 0 AND duration_min <= 1440),
	CONSTRAINT "appointments_time_order_check" CHECK (ends_at > starts_at),
	CONSTRAINT "appointments_price_check" CHECK (price_kopecks >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid,
	"refresh_token_hash" varchar(255) NOT NULL,
	"access_token_hash" varchar(255),
	"scope" varchar(16) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_reason" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_scope_tenant_check" CHECK ((scope = 'platform' AND tenant_id IS NULL) OR (scope = 'tenant' AND tenant_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" varchar(500) NOT NULL,
	"mime" varchar(100) NOT NULL,
	"size" bigint NOT NULL,
	"sha256" varchar(64),
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"alt" varchar(500),
	"caption" text,
	"module" varchar(32) NOT NULL,
	"entity_id" uuid,
	"uploaded_by_user_id" uuid,
	"status" varchar(20) DEFAULT 'uploading' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_tenant_prefix_check" CHECK (key LIKE 'tenant/' || tenant_id::text || '/%')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"locale" varchar(8) DEFAULT 'ru' NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"meta_title" varchar(255),
	"meta_description" text,
	"cover_image_key" varchar(500),
	"author_user_id" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log_tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid,
	"payload_diff" jsonb,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"request_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log_platform" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(64) NOT NULL,
	"affected_tenant_id" uuid,
	"payload_diff" jsonb,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"request_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "salons" ADD CONSTRAINT "salons_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_design_tokens" ADD CONSTRAINT "tenant_design_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_menu_items" ADD CONSTRAINT "tenant_menu_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_menu_items" ADD CONSTRAINT "tenant_menu_items_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tenant_menu_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff" ADD CONSTRAINT "staff_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff" ADD CONSTRAINT "staff_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;
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
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log_tenant" ADD CONSTRAINT "audit_log_tenant_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log_tenant" ADD CONSTRAINT "audit_log_tenant_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log_platform" ADD CONSTRAINT "audit_log_platform_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log_platform" ADD CONSTRAINT "audit_log_platform_affected_tenant_id_tenants_id_fk" FOREIGN KEY ("affected_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_uniq" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_primary_domain_uniq" ON "tenants" USING btree ("primary_domain") WHERE "tenants"."primary_domain" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_uniq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_admins_role_idx" ON "platform_admins" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "salons_tenant_slug_uniq" ON "salons" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "salons_tenant_status_idx" ON "salons" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "salons_tenant_city_idx" ON "salons" USING btree ("tenant_id","city");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_users_tenant_user_uniq" ON "tenant_users" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_users_tenant_role_idx" ON "tenant_users" USING btree ("tenant_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_users_salon_role_idx" ON "tenant_users" USING btree ("salon_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tmi_tenant_parent_sort_idx" ON "tenant_menu_items" USING btree ("tenant_id","parent_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tmi_tenant_locale_idx" ON "tenant_menu_items" USING btree ("tenant_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "services_tenant_salon_slug_uniq" ON "services" USING btree ("tenant_id","salon_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_tenant_status_idx" ON "services" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_tenant_category_idx" ON "services" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_salon_status_idx" ON "services" USING btree ("salon_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_tenant_salon_status_idx" ON "staff" USING btree ("tenant_id","salon_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_user_idx" ON "staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_services_tenant_idx" ON "staff_services" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_services_service_idx" ON "staff_services" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clients_tenant_phone_uniq" ON "clients" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_tenant_email_idx" ON "clients" USING btree ("tenant_id","email") WHERE "clients"."email" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_tenant_status_idx" ON "clients" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_user_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_tenant_starts_idx" ON "appointments" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_tenant_salon_starts_idx" ON "appointments" USING btree ("tenant_id","salon_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_staff_starts_idx" ON "appointments" USING btree ("staff_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_client_starts_idx" ON "appointments" USING btree ("client_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_tenant_status_idx" ON "appointments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_idempotency_uniq" ON "appointments" USING btree ("tenant_id","idempotency_key") WHERE "appointments"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_tenant_user_idx" ON "sessions" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_refresh_token_uniq" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "media_key_uniq" ON "media" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_tenant_module_idx" ON "media" USING btree ("tenant_id","module");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_tenant_entity_idx" ON "media" USING btree ("tenant_id","module","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_tenant_created_idx" ON "media" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cms_pages_tenant_slug_locale_uniq" ON "cms_pages" USING btree ("tenant_id","slug","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_pages_tenant_status_idx" ON "cms_pages" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_pages_tenant_published_idx" ON "cms_pages" USING btree ("tenant_id","published_at" DESC NULLS LAST) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alt_tenant_created_idx" ON "audit_log_tenant" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alt_tenant_action_idx" ON "audit_log_tenant" USING btree ("tenant_id","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alt_tenant_entity_idx" ON "audit_log_tenant" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alt_actor_idx" ON "audit_log_tenant" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alp_actor_created_idx" ON "audit_log_platform" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alp_affected_tenant_idx" ON "audit_log_platform" USING btree ("affected_tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alp_action_idx" ON "audit_log_platform" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alp_created_idx" ON "audit_log_platform" USING btree ("created_at" DESC NULLS LAST);
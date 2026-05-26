-- Phase A · work4u → NAS migration · MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §2
--
-- HAND-EDITED 2026-05-26: removed Drizzle's catch-up emission for hand-written 0002_chat /
-- 0003_tenant_bootstrap migrations (snapshot drift — Council D-5 detected; tracked as
-- anticipated ADR-002 in governance/decision-graph.md). Kept ONLY Phase A scope:
--   - 6 new tenant-scoped tables (partner_salons, wfy_city_pages, wfy_opportunities,
--     wfy_vacancies, wfy_advantages, lead_applications)
--   - ALTER tenants ADD COLUMN site_type (NOT NULL, default 'generic-cms')
--   - composite (tenant_id, ...) indexes on every new table
--   - FK CASCADE to tenants; partner_salons.logo_media_id → media ON DELETE SET NULL

-- ── 6 new tenant-scoped tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "partner_salons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"address" text,
	"phone" varchar(64),
	"email" varchar(320),
	"external_link" text,
	"logo_media_id" uuid,
	"ord" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wfy_city_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"city_name" varchar(128) NOT NULL,
	"region" varchar(128),
	"country" varchar(2) DEFAULT 'RU' NOT NULL,
	"headline" varchar(500),
	"description" text,
	"extras" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wfy_city_pages_slug_format_check" CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wfy_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"headline" varchar(255),
	"description" text,
	"cover_image_key" varchar(500),
	"ord" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wfy_vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wfy_vacancies_code_format_check" CHECK (code ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wfy_advantages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"icon_name" varchar(64),
	"ord" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_source" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(64),
	"email" varchar(320),
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attached_media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"source_page" text,
	"user_agent" text,
	"ip_address" varchar(64),
	"telegram_sent" boolean DEFAULT false NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── ALTER tenants: add site_type ────────────────────────────────────────────

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "site_type" varchar(32) DEFAULT 'generic-cms' NOT NULL;
--> statement-breakpoint

-- ── FK constraints (idempotent via DO $$ EXCEPTION duplicate_object) ────────

DO $$ BEGIN
 ALTER TABLE "partner_salons" ADD CONSTRAINT "partner_salons_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_salons" ADD CONSTRAINT "partner_salons_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wfy_city_pages" ADD CONSTRAINT "wfy_city_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wfy_opportunities" ADD CONSTRAINT "wfy_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wfy_vacancies" ADD CONSTRAINT "wfy_vacancies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wfy_advantages" ADD CONSTRAINT "wfy_advantages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_applications" ADD CONSTRAINT "lead_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── Composite indexes — (tenant_id, ...) on every new table ─────────────────

CREATE INDEX IF NOT EXISTS "partner_salons_tenant_ord_idx" ON "partner_salons" USING btree ("tenant_id","ord");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wfy_city_pages_tenant_slug_uniq" ON "wfy_city_pages" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wfy_city_pages_tenant_status_idx" ON "wfy_city_pages" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wfy_city_pages_tenant_ord_idx" ON "wfy_city_pages" USING btree ("tenant_id","ord");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wfy_opportunities_tenant_ord_idx" ON "wfy_opportunities" USING btree ("tenant_id","ord");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wfy_vacancies_tenant_code_uniq" ON "wfy_vacancies" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wfy_vacancies_tenant_ord_idx" ON "wfy_vacancies" USING btree ("tenant_id","ord");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wfy_advantages_tenant_ord_idx" ON "wfy_advantages" USING btree ("tenant_id","ord");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_applications_tenant_created_idx" ON "lead_applications" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_applications_tenant_source_idx" ON "lead_applications" USING btree ("tenant_id","form_source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_applications_tenant_status_idx" ON "lead_applications" USING btree ("tenant_id","status");

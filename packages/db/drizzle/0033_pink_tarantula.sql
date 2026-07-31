CREATE TABLE IF NOT EXISTS "massage_masters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"price_from" numeric(10, 2),
	"main_photo_url" varchar(500),
	"photo_urls" jsonb,
	"availability_status" varchar(20) DEFAULT 'available' NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "massage_service_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"duration_minutes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "massage_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"contact" varchar(100) NOT NULL,
	"desired_date" varchar(50),
	"comment" text,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "massage_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"contact" varchar(100) NOT NULL,
	"comment" text,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "massage_settings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"catalog_mode" varchar(20) DEFAULT 'open' NOT NULL,
	"site_name" varchar(100) DEFAULT 'Название проекта' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "massage_service_programs" ADD CONSTRAINT "massage_service_programs_master_id_massage_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."massage_masters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "massage_bookings" ADD CONSTRAINT "massage_bookings_master_id_massage_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."massage_masters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "massage_master_slug_unique" ON "massage_masters" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "massage_master_published_idx" ON "massage_masters" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "massage_program_master_idx" ON "massage_service_programs" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "massage_booking_master_idx" ON "massage_bookings" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "massage_booking_status_idx" ON "massage_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "massage_access_request_status_idx" ON "massage_access_requests" USING btree ("status");
CREATE TABLE IF NOT EXISTS "model_contact_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_profile_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"viewer_hash" varchar(64) NOT NULL,
	"view_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_contact_events" ADD CONSTRAINT "model_contact_events_model_id_model_profiles_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profile_views" ADD CONSTRAINT "model_profile_views_model_id_model_profiles_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_contact_events_model_channel_idx" ON "model_contact_events" USING btree ("model_id","channel","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "model_profile_views_dedup_uniq" ON "model_profile_views" USING btree ("model_id","viewer_hash","view_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_profile_views_model_date_idx" ON "model_profile_views" USING btree ("model_id","view_date");
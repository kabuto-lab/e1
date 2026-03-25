ALTER TABLE "model_profiles" ADD COLUMN "biography" text;--> statement-breakpoint
ALTER TABLE "model_profiles" ADD COLUMN "main_photo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "model_profiles" ADD COLUMN "is_published" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "model_profiles" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "bucket" varchar(100) DEFAULT 'escort-media';--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "presigned_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "presigned_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_files" ADD CONSTRAINT "media_files_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_published_idx" ON "model_profiles" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_moderation_idx" ON "media_files" USING btree ("moderation_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "media_storage_key_unique" ON "media_files" USING btree ("storage_key");
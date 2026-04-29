-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0015 · CMS: страницы и записи (cms_pages)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "cms_pages" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type"                varchar(20) NOT NULL DEFAULT 'page',
  "title"               varchar(500) NOT NULL DEFAULT '',
  "slug"                varchar(255) NOT NULL,
  "content"             jsonb,
  "excerpt"             text,
  "status"              varchar(20) NOT NULL DEFAULT 'draft',
  "featured_image_url"  text,
  "meta_title"          varchar(255),
  "meta_description"    text,
  "author_id"           uuid,
  "published_at"        timestamp,
  "created_at"          timestamp DEFAULT now() NOT NULL,
  "updated_at"          timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "cms_pages"
    ADD CONSTRAINT "cms_pages_author_id_users_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "cms_pages_slug_uniq"
  ON "cms_pages" USING btree ("slug");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "cms_pages_type_status_idx"
  ON "cms_pages" USING btree ("type", "status");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "cms_pages_created_at_idx"
  ON "cms_pages" USING btree ("created_at" DESC);

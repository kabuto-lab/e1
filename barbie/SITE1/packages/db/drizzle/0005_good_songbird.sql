CREATE TABLE IF NOT EXISTS "girls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(255) NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" text,
	"media_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "girls_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "girls_ord_idx" ON "girls" USING btree ("ord");
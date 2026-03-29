CREATE TABLE IF NOT EXISTS "platform_settings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "platform_settings" ("id", "data", "updated_at")
SELECT 'default', '{}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM "platform_settings" WHERE "id" = 'default');

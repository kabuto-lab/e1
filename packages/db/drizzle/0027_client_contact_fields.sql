ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "contact_telegram" varchar(120);--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "contact_whatsapp" varchar(40);

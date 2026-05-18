ALTER TABLE "tenants" ADD COLUMN "bootstrap_source_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "custom_domain" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_custom_domain_uniq" ON "tenants" USING btree ("custom_domain") WHERE "custom_domain" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_custom_domain_idx" ON "tenants" USING btree ("custom_domain");

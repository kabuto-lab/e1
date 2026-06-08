CREATE TABLE IF NOT EXISTS "tenant_touchpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"label" varchar(120) DEFAULT '' NOT NULL,
	"value" varchar(500) DEFAULT '' NOT NULL,
	"image_key" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_touchpoints_key_check" CHECK (key IN ('booking','operator','footer','callWidget','telegram','quiz','popup'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_touchpoints" ADD CONSTRAINT "tenant_touchpoints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_touchpoints_tenant_key_uniq" ON "tenant_touchpoints" USING btree ("tenant_id","key");
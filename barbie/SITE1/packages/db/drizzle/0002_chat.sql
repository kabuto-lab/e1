CREATE TABLE IF NOT EXISTS "chat_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(8) NOT NULL,
	"title" varchar(120),
	"salon_id" uuid,
	"dm_key" varchar(80),
	"created_by" uuid NOT NULL,
	"last_message_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_channels_type_check" CHECK (type IN ('dm','group')),
	CONSTRAINT "chat_channels_dm_shape_check" CHECK ((type = 'dm' AND dm_key IS NOT NULL AND title IS NULL) OR (type = 'group' AND dm_key IS NULL AND title IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_channel_members" (
	"channel_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(8) DEFAULT 'member' NOT NULL,
	"last_read_at" timestamp,
	"muted" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_channel_members_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply_to_message_id" uuid,
	"edited_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_body_len_check" CHECK (length(body) <= 8000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_channel_members" ADD CONSTRAINT "chat_channel_members_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_channel_members" ADD CONSTRAINT "chat_channel_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_channel_members" ADD CONSTRAINT "chat_channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_fk" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_events" ADD CONSTRAINT "chat_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_events" ADD CONSTRAINT "chat_events_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_channels_tenant_updated_idx" ON "chat_channels" USING btree ("tenant_id","archived_at","last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_channels_tenant_salon_idx" ON "chat_channels" USING btree ("tenant_id","salon_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_channels_dm_uniq" ON "chat_channels" USING btree ("tenant_id","dm_key") WHERE "chat_channels"."dm_key" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_members_tenant_user_idx" ON "chat_channel_members" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_members_channel_idx" ON "chat_channel_members" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_channel_created_idx" ON "chat_messages" USING btree ("tenant_id","channel_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_author_created_idx" ON "chat_messages" USING btree ("tenant_id","author_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_events_tenant_channel_id_idx" ON "chat_events" USING btree ("tenant_id","channel_id","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_events_created_at_idx" ON "chat_events" USING btree ("created_at");

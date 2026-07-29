CREATE TABLE IF NOT EXISTS "telegram_relay_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_telegram_id" bigint NOT NULL,
	"recipient_telegram_id" bigint NOT NULL,
	"forwarded_message_id" bigint,
	"content" text NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_relay_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"client_user_id" uuid NOT NULL,
	"client_telegram_id" bigint,
	"client_telegram_username" varchar(64),
	"counterpart_user_id" uuid NOT NULL,
	"counterpart_telegram_id" bigint NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"token" varchar(64),
	"token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_relay_messages" ADD CONSTRAINT "telegram_relay_messages_thread_id_telegram_relay_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."telegram_relay_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_relay_threads" ADD CONSTRAINT "telegram_relay_threads_model_id_model_profiles_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_relay_threads" ADD CONSTRAINT "telegram_relay_threads_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_relay_threads" ADD CONSTRAINT "telegram_relay_threads_counterpart_user_id_users_id_fk" FOREIGN KEY ("counterpart_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_relay_messages_thread_idx" ON "telegram_relay_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_relay_messages_reply_idx" ON "telegram_relay_messages" USING btree ("recipient_telegram_id","forwarded_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_relay_threads_token_idx" ON "telegram_relay_threads" USING btree ("token") WHERE "telegram_relay_threads"."token" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_relay_threads_client_tg_idx" ON "telegram_relay_threads" USING btree ("client_telegram_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_relay_threads_counterpart_tg_idx" ON "telegram_relay_threads" USING btree ("counterpart_telegram_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_relay_threads_status_idx" ON "telegram_relay_threads" USING btree ("status");
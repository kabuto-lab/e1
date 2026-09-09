CREATE TABLE IF NOT EXISTS "user_telegram_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"telegram_id" bigint NOT NULL,
	"telegram_username" varchar(64),
	"label" varchar(60),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_profiles" ADD COLUMN "operator_telegram_account_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_telegram_accounts" ADD CONSTRAINT "user_telegram_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_telegram_accounts_telegram_id_unique" ON "user_telegram_accounts" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_telegram_accounts_user_id_idx" ON "user_telegram_accounts" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_profiles" ADD CONSTRAINT "model_profiles_operator_telegram_account_id_user_telegram_accounts_id_fk" FOREIGN KEY ("operator_telegram_account_id") REFERENCES "public"."user_telegram_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

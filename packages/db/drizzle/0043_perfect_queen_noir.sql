ALTER TABLE "telegram_relay_threads" ALTER COLUMN "counterpart_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "telegram_relay_threads" ALTER COLUMN "counterpart_telegram_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "telegram_relay_threads" ADD COLUMN "claimed_at" timestamp;
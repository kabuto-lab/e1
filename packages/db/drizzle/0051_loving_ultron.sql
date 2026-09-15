ALTER TABLE "payout_requests" ADD COLUMN "method" varchar(16) DEFAULT 'bank' NOT NULL;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD COLUMN "ton_wallet_address" varchar(120);--> statement-breakpoint
ALTER TABLE "payout_requests" ADD COLUMN "usdt_rub_rate_at_approval" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "payout_requests" ADD COLUMN "usdt_amount_atomic" bigint;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD COLUMN "ton_tx_hash" varchar(128);
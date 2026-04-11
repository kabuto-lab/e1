ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "expected_amount_atomic" bigint;--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "received_amount_atomic" bigint;--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "asset_decimals" smallint;--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "network" varchar(24);--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "jetton_master_address" varchar(120);--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "treasury_address" varchar(120);--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "expected_memo" varchar(128);--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "funded_tx_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "release_tx_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "refund_tx_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "escrow_transactions" ADD COLUMN IF NOT EXISTS "confirmations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_provider_network_idx" ON "escrow_transactions" USING btree ("payment_provider","network");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "escrow_expected_memo_uidx" ON "escrow_transactions" USING btree ("expected_memo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "escrow_funded_tx_hash_uidx" ON "escrow_transactions" USING btree ("funded_tx_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "escrow_release_tx_hash_uidx" ON "escrow_transactions" USING btree ("release_tx_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "escrow_refund_tx_hash_uidx" ON "escrow_transactions" USING btree ("refund_tx_hash");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escrow_ton_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_transaction_id" uuid NOT NULL,
	"tx_hash" varchar(128) NOT NULL,
	"logical_time" bigint,
	"from_address_raw" varchar(128) NOT NULL,
	"treasury_address_raw" varchar(128) NOT NULL,
	"jetton_master_raw" varchar(128) NOT NULL,
	"amount_atomic" bigint NOT NULL,
	"memo_matched" varchar(128),
	"confirmation_count" integer DEFAULT 0 NOT NULL,
	"indexer_source" varchar(32),
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escrow_ton_deposits" ADD CONSTRAINT "escrow_ton_deposits_escrow_transaction_id_escrow_transactions_id_fk" FOREIGN KEY ("escrow_transaction_id") REFERENCES "public"."escrow_transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "escrow_ton_deposits_tx_hash_uidx" ON "escrow_ton_deposits" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_ton_deposits_escrow_idx" ON "escrow_ton_deposits" USING btree ("escrow_transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_ton_deposits_created_idx" ON "escrow_ton_deposits" USING btree ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escrow_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_transaction_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"actor_type" varchar(24) NOT NULL,
	"actor_user_id" uuid,
	"correlation_id" varchar(64),
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escrow_audit_events" ADD CONSTRAINT "escrow_audit_events_escrow_transaction_id_escrow_transactions_id_fk" FOREIGN KEY ("escrow_transaction_id") REFERENCES "public"."escrow_transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escrow_audit_events" ADD CONSTRAINT "escrow_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_audit_escrow_idx" ON "escrow_audit_events" USING btree ("escrow_transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_audit_type_idx" ON "escrow_audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_audit_created_idx" ON "escrow_audit_events" USING btree ("created_at");

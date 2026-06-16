CREATE TABLE IF NOT EXISTS "tbank_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_transaction_id" uuid NOT NULL,
	"tbank_order_id" varchar(64) NOT NULL,
	"tbank_payment_id" varchar(64),
	"payment_url" varchar(512),
	"last_webhook_token" varchar(128),
	"status" varchar(24) DEFAULT 'NEW',
	"raw_init_payload" jsonb,
	"raw_webhook_payload" jsonb,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tbank_orders_escrow_transaction_id_unique" UNIQUE("escrow_transaction_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tbank_orders" ADD CONSTRAINT "tbank_orders_escrow_transaction_id_escrow_transactions_id_fk" FOREIGN KEY ("escrow_transaction_id") REFERENCES "public"."escrow_transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tbank_orders_escrow_idx" ON "tbank_orders" USING btree ("escrow_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tbank_orders_tbank_order_id_uidx" ON "tbank_orders" USING btree ("tbank_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tbank_orders_status_idx" ON "tbank_orders" USING btree ("status");

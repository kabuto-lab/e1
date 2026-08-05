CREATE TABLE IF NOT EXISTS "payout_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"note" text,
	"processed_by_user_id" uuid,
	"processed_at" timestamp with time zone,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_profiles" ADD COLUMN "manager_commission_rate" numeric(4, 3);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "manager_payout" numeric(12, 2);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_processed_by_user_id_users_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_requests_user_idx" ON "payout_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_requests_status_idx" ON "payout_requests" USING btree ("status");
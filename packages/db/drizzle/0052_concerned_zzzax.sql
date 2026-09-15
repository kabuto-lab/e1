ALTER TABLE "bookings" ADD COLUMN "refund_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refund_requested_reason" text;
ALTER TABLE "reviews" ADD COLUMN "characteristics" jsonb;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "complaint_status" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "complaint_reason" varchar(40);--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "complaint_comment" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "complaint_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "complaint_resolution" varchar(20);--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "complaint_resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "complaint_resolved_by" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_complaint_resolved_by_users_id_fk" FOREIGN KEY ("complaint_resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

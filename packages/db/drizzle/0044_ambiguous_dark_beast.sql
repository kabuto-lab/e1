ALTER TABLE "employee_profiles" ADD COLUMN "can_manage_payouts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "can_manage_verification" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "can_edit_models" boolean DEFAULT false NOT NULL;
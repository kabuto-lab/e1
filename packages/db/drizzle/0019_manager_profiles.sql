CREATE TABLE "manager_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "full_name" varchar(120) NOT NULL,
  "company_name" varchar(200),
  "phone" varchar(30) NOT NULL,
  "telegram_contact" varchar(64),
  "review_note" text,
  "approved_by" uuid,
  "approved_at" timestamp,
  "rejected_at" timestamp,
  "rejection_reason" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "manager_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "manager_profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "manager_profiles_user_id_unique" ON "manager_profiles" ("user_id");
CREATE INDEX "manager_profiles_approved_by_idx" ON "manager_profiles" ("approved_by");

-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0013 · Серверное избранное клиента (lk3)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "client_favorites" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL,
  "model_id"   uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "client_favorites"
    ADD CONSTRAINT "client_favorites_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "client_favorites"
    ADD CONSTRAINT "client_favorites_model_id_model_profiles_id_fk"
    FOREIGN KEY ("model_id") REFERENCES "public"."model_profiles"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "client_favorites_user_model_uniq"
  ON "client_favorites" USING btree ("user_id", "model_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "client_favorites_user_id_idx"
  ON "client_favorites" USING btree ("user_id");

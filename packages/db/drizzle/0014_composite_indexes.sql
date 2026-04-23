-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0014 · Составные индексы (P2.2 — performance)
-- ═══════════════════════════════════════════════════════════════════════════
-- Частые запросы «брони клиента/модели по статусу» + «медиа профиля видимые»
-- до этого шли через Seq Scan — составные индексы переводят на Index Scan.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS "booking_client_status_idx"
  ON "bookings" USING btree ("client_id", "status");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "booking_model_status_idx"
  ON "bookings" USING btree ("model_id", "status");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "media_profile_visibility_idx"
  ON "media_files" USING btree ("model_id", "is_public_visible");

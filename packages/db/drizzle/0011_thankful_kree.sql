-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0011 · Telegram identity + web-first linking tokens
-- ═══════════════════════════════════════════════════════════════════════════
-- Назначение:
--   1. users.email_hash / password_hash → nullable (для TG-only клиентов).
--   2. users: 6 телеграм-колонок (минимум PII по политике §P1).
--   3. CHECK users_staff_credentials_check: staff обязан иметь email+password.
--   4. Partial unique index на users.telegram_id.
--   5. Новая таблица telegram_link_tokens для web-first линковки.
--
-- ВНИМАНИЕ: drizzle-kit generate изначально выдал широкий SQL, т.к. в репо
-- отсутствовали снимки meta/0002..0010_snapshot.json. Этот файл переписан
-- вручную и содержит ТОЛЬКО изменения, относящиеся к Telegram-интеграции;
-- ретро-операции из 0002..0010 из вывода убраны, т.к. они уже применены.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Снимаем старое unique-ограничение на email_hash (оно было через .unique()
--    и могло превратиться либо в CONSTRAINT, либо в INDEX — чистим оба).
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_hash_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "email_hash_idx";--> statement-breakpoint

-- 2. email_hash и password_hash становятся nullable для TG-only клиентов.
ALTER TABLE "users" ALTER COLUMN "email_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint

-- 3. Telegram identity columns (минимум PII — только id, username, locale).
--    IF NOT EXISTS: миграция идемпотентна — если часть колонок уже добавлена
--    вручную/частично (например, после прерванного прогона), повторный запуск
--    не падает, а дописывает недостающие.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_id" bigint;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_username" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_language_code" varchar(8);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_linked_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_disclaimer_acked_at" timestamp;--> statement-breakpoint

-- 4. Partial unique-индексы (allowNULLdупли, запрещают дубли заполненных).
CREATE UNIQUE INDEX IF NOT EXISTS "email_hash_idx"
  ON "users" USING btree ("email_hash")
  WHERE "users"."email_hash" is not null;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_id_unique_nonnull"
  ON "users" USING btree ("telegram_id")
  WHERE "users"."telegram_id" is not null;--> statement-breakpoint

-- 5. CHECK: staff (admin/manager/moderator) должны иметь email + password.
--    client/model могут жить только с telegram_id (защищён partial unique выше).
--    DO-блок с EXCEPTION — чтобы повторный запуск миграции не падал на duplicate.
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_staff_credentials_check"
    CHECK (role IN ('client','model') OR (email_hash IS NOT NULL AND password_hash IS NOT NULL));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 6. Новая таблица одноразовых токенов для web-first линковки (TTL 5 минут).
CREATE TABLE IF NOT EXISTS "telegram_link_tokens" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"      uuid NOT NULL,
  "token"        varchar(64) NOT NULL,
  "expires_at"   timestamp NOT NULL,
  "consumed_at"  timestamp,
  "created_at"   timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "telegram_link_tokens"
    ADD CONSTRAINT "telegram_link_tokens_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_link_tokens_token_idx"
  ON "telegram_link_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_link_tokens_user_id_idx"
  ON "telegram_link_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_link_tokens_expires_idx"
  ON "telegram_link_tokens" USING btree ("expires_at");

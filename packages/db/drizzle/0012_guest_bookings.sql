-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0012 · Гостевые бронирования (5.16)
-- ═══════════════════════════════════════════════════════════════════════════
-- client_id становится nullable — гостевые брони создаются без аккаунта.
-- Добавляем 4 гостевых поля: имя, телефон, email, сообщение.
-- Ограничение: либо client_id заполнен, либо guest_name + guest_phone.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "bookings" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_name" varchar(100);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_email" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_message" text;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_or_guest_check"
    CHECK (
      client_id IS NOT NULL
      OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

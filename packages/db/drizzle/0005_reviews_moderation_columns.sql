-- Синхронизация таблицы reviews с Drizzle-схемой (если колонок ещё не было)
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "moderation_status" varchar(20) DEFAULT 'pending';
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "moderation_reason" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "helpful_count" integer DEFAULT 0;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "not_helpful_count" integer DEFAULT 0;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

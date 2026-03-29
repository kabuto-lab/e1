-- 1) Примените при необходимости: packages/db/drizzle/0005_reviews_moderation_columns.sql
-- 2) docker exec -i escort-postgres psql -U postgres -d companion_db < scripts/seed-yulianna-test-review.sql

INSERT INTO client_profiles (user_id)
SELECT u.id FROM users u
WHERE u.email_hash = 'f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a'
  AND NOT EXISTS (SELECT 1 FROM client_profiles c WHERE c.user_id = u.id)
LIMIT 1;

INSERT INTO reviews (client_id, model_id, booking_id, rating, comment, is_verified, is_public, moderation_status, updated_at)
SELECT cp.id,
       mp.id,
       NULL,
       5,
       'Тестовый отзыв для проверки анкеты и blueprint: встреча состоялась, всё на высшем уровне.',
       true,
       true,
       'approved',
       now()
FROM model_profiles mp
INNER JOIN client_profiles cp ON cp.user_id = (
  SELECT u.id FROM users u
  WHERE u.email_hash = 'f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a'
  LIMIT 1
)
WHERE mp.slug = 'yulianna'
  AND NOT EXISTS (
    SELECT 1 FROM reviews r
    WHERE r.model_id = mp.id
      AND r.comment LIKE 'Тестовый отзыв для проверки анкеты%'
  )
LIMIT 1;

-- Если отзыв уже был без moderation-колонок: после 0005
-- UPDATE reviews SET is_public = true, moderation_status = 'approved', updated_at = now()
-- WHERE model_id = (SELECT id FROM model_profiles WHERE slug = 'yulianna')
--   AND comment LIKE 'Тестовый отзыв для проверки анкеты%';

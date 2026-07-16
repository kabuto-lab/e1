-- Регистрация client/model/manager вокруг login+password + код восстановления.
-- См. packages/db/src/schema/users.ts, manager-profiles.ts, model-profiles.ts.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login" varchar(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recovery_code" varchar(12);

CREATE UNIQUE INDEX IF NOT EXISTS "users_login_unique_nonnull" ON "users" (lower("login")) WHERE "login" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_recovery_code_unique_nonnull" ON "users" ("recovery_code") WHERE "recovery_code" IS NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_staff_credentials_check";
ALTER TABLE "users" ADD CONSTRAINT "users_staff_credentials_check"
  CHECK (role IN ('client','model') OR (password_hash IS NOT NULL AND (login IS NOT NULL OR email_hash IS NOT NULL OR phone_hash IS NOT NULL)));

-- Менеджер больше не вводит телефон при регистрации (только Имя/ФИО+Компания).
ALTER TABLE "manager_profiles" ALTER COLUMN "phone" DROP NOT NULL;

-- Способ связи "E-mail" для модели — раньше был только telegram/phone/whatsapp.
ALTER TABLE "model_profiles" ADD COLUMN IF NOT EXISTS "contact_email" varchar(255);

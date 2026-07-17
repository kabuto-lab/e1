-- Менеджер тоже выбирает способ связи при регистрации (как модель): phone/telegram —
-- уже есть колонки, email — через users.email, whatsapp — новая колонка ниже.
ALTER TABLE "manager_profiles" ADD COLUMN IF NOT EXISTS "contact_whatsapp" varchar(40);

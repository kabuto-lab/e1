-- Add contact fields to model_profiles
ALTER TABLE model_profiles
  ADD COLUMN IF NOT EXISTS contact_telegram varchar(120),
  ADD COLUMN IF NOT EXISTS contact_phone    varchar(40),
  ADD COLUMN IF NOT EXISTS contact_whatsapp varchar(40);

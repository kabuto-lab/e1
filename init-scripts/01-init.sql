-- Init script for Escort Platform Database
-- This file runs automatically on first PostgreSQL startup

-- Enable UUID extension (required for our schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблицы не создаются сами: после первого старта Postgres выполни из корня репо:
--   npm run db:migrate --workspace=@escort/db
-- (или START-DEV.bat — миграции и сиды включены.)


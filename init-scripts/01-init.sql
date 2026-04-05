-- Init script for Escort Platform Database
-- This file runs automatically on first PostgreSQL startup

-- Enable UUID extension (required for our schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблицы не создаются сами. После первого старта Postgres (и на VPS после нового тома):
--   npm run db:bootstrap
-- (= миграции @escort/db + сид моделей seed-models-simple.ts)


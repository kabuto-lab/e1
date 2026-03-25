-- Init script for Escort Platform Database
-- This file runs automatically on first PostgreSQL startup

-- Enable UUID extension (required for our schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Tables will be created by Drizzle ORM on first API startup
-- Test users will be created via API registration endpoint


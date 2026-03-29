ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_tier" varchar(20) DEFAULT 'none' NOT NULL;
UPDATE "users" SET "subscription_tier" = 'premium' WHERE "email_hash" = 'f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a';

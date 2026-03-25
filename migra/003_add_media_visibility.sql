-- Migration: Add visibility control to media_files
-- Date: 2026-03-25
-- Description: Add columns for public visibility toggle and album categorization

-- Add is_public_visible column (default: true for backward compatibility)
ALTER TABLE media_files
ADD COLUMN IF NOT EXISTS is_public_visible BOOLEAN DEFAULT true;

-- Add album_category column (default: 'portfolio')
ALTER TABLE media_files
ADD COLUMN IF NOT EXISTS album_category VARCHAR(50) DEFAULT 'portfolio';

-- Add index for faster public photo queries
CREATE INDEX IF NOT EXISTS idx_media_public_visible 
ON media_files(is_public_visible, model_id, sort_order);

-- Create index for album category filtering
CREATE INDEX IF NOT EXISTS idx_media_album_category 
ON media_files(album_category, model_id);

-- Comment describing the columns
COMMENT ON COLUMN media_files.is_public_visible IS 'Toggle show/hide on public profile';
COMMENT ON COLUMN media_files.album_category IS 'Album category: portfolio, vip, elite, verified';

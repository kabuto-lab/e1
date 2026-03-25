-- Debug: Check model photos and main_photo_url
-- Run this in your database to see what's happening

-- Check if models have main_photo_url set
SELECT 
    id,
    display_name,
    slug,
    main_photo_url,
    is_published,
    created_at
FROM model_profiles
ORDER BY created_at DESC;

-- Check what media files exist
SELECT 
    mf.id,
    mf.model_id,
    mf.cdn_url,
    mf.file_type,
    mf.moderation_status,
    mf.is_public_visible,
    mf.album_category,
    mf.created_at
FROM media_files mf
ORDER BY mf.created_at DESC;

-- Find models WITHOUT main_photo_url but WITH media files
SELECT 
    mp.id as model_id,
    mp.display_name,
    mp.main_photo_url,
    COUNT(mf.id) as photo_count,
    MIN(mf.cdn_url) as first_photo_url
FROM model_profiles mp
LEFT JOIN media_files mf ON mf.model_id = mp.id AND mf.file_type = 'photo'
WHERE mp.main_photo_url IS NULL
GROUP BY mp.id, mp.display_name, mp.main_photo_url
HAVING COUNT(mf.id) > 0;

-- Fix: Set main_photo_url for models that have photos but no main photo
-- Uncomment to run:
/*
UPDATE model_profiles mp
SET main_photo_url = (
    SELECT mf.cdn_url 
    FROM media_files mf 
    WHERE mf.model_id = mp.id 
    AND mf.file_type = 'photo' 
    AND mf.moderation_status = 'approved'
    ORDER BY mf.sort_order, mf.created_at 
    LIMIT 1
)
WHERE mp.main_photo_url IS NULL
AND EXISTS (
    SELECT 1 FROM media_files mf 
    WHERE mf.model_id = mp.id 
    AND mf.file_type = 'photo'
);
*/

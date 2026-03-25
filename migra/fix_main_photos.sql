-- Fix: Set main_photo_url for models that have photos but no main photo
-- This updates all model profiles that have media files but no main_photo_url set

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

-- Verify the update
SELECT 
    id,
    display_name,
    main_photo_url,
    is_published
FROM model_profiles
ORDER BY created_at DESC;

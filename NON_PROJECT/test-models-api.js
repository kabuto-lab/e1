// Run this in browser console on http://localhost:3001/dashboard/models/list
// to debug why photos aren't showing

(async () => {
  console.log('🔍 Testing API directly...');
  
  try {
    const response = await fetch('http://localhost:3000/models');
    const data = await response.json();
    
    console.log('📋 API Response:', data);
    console.log('📋 Number of models:', data.length);
    
    if (data.length > 0) {
      const first = data[0];
      console.log('📋 First model:', {
        id: first.id,
        displayName: first.displayName,
        slug: first.slug,
        mainPhotoUrl: first.mainPhotoUrl,
        hasPhoto: !!first.mainPhotoUrl,
        photoCount: first.photoCount,
      });
      
      if (!first.mainPhotoUrl) {
        console.warn('⚠️ First model has NO mainPhotoUrl!');
        console.warn('⚠️ Run this SQL to fix:');
        console.warn(`
UPDATE model_profiles mp
SET main_photo_url = (
    SELECT mf.cdn_url 
    FROM media_files mf 
    WHERE mf.model_id = mp.id 
    AND mf.file_type = 'photo' 
    ORDER BY mf.created_at 
    LIMIT 1
)
WHERE mp.main_photo_url IS NULL;
        `);
      } else {
        console.log('✅ First model HAS a photo URL:', first.mainPhotoUrl);
      }
    }
  } catch (error) {
    console.error('❌ API Error:', error);
  }
})();

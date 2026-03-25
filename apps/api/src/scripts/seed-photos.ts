/**
 * Seed Script - Add main photo URLs to existing models
 * 
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/seed-photos.ts
 */

import * as dotenv from 'dotenv';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

dotenv.config();

// Map of model slugs to their main photo filenames
const MODEL_PHOTOS = {
  'yulianna': 'photo-1544005313-94ddf0286df2.jpg',
  'viktoria': 'photo-1534528741775-53994a69daeb.jpg',
  'alina': 'photo-1524504388940-b1c1722653e1.jpg',
  'sofia': 'photo-1531746020798-e6953c6e8e04.jpg',
  'natalia': 'photo-1529626455594-4ff0802cfb7e.jpg',
  'elena': 'photo-1488426862026-3ee34a7d66df.jpg',
  'maria': 'photo-1544005313-94ddf0286df2.jpg',
  'anastasia': 'photo-1534528741775-53994a69daeb.jpg',
  'ksenia': 'photo-1529626455594-4ff0802cfb7e.jpg',
  'olga': 'photo-1531746020798-e6953c6e8e04.jpg',
  'daria': 'photo-1524504388940-b1c1722653e1.jpg',
  'ekaterina': 'photo-1544005313-94ddf0286df2.jpg',
  'irina': 'photo-1534528741775-53994a69daeb.jpg',
};

async function seed() {
  const logger = console;
  
  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }
  
  logger.log('🌱 Starting photos seed...');
  
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  
  try {
    logger.log('✅ Connected to database');
    
    let updated = 0;
    let skipped = 0;
    
    // Base URL for images served from Next.js public folder
    const baseUrl = 'http://localhost:3001/images_tst/';
    
    for (const [slug, filename] of Object.entries(MODEL_PHOTOS)) {
      // Check if model exists
      const existing = await sql`
        SELECT id, display_name, main_photo_url FROM model_profiles WHERE slug = ${slug}
      `;
      
      if (existing.length === 0) {
        logger.log(`⏭️  Skipped: ${slug} (not found)`);
        skipped++;
        continue;
      }
      
      const model = existing[0];
      const photoUrl = baseUrl + filename;
      
      // Skip if already has photo
      if (model.main_photo_url) {
        logger.log(`⏭️  Skipped: ${slug} (already has photo)`);
        skipped++;
        continue;
      }
      
      // Update model with main photo URL
      await sql`
        UPDATE model_profiles 
        SET main_photo_url = ${photoUrl}, updated_at = NOW()
        WHERE id = ${model.id}
      `;
      
      logger.log(`✅ Updated: ${model.display_name} (${slug}) → ${filename}`);
      updated++;
    }
    
    logger.log('===========================================');
    logger.log(`🎉 Photos seed completed!`);
    logger.log(`   ✅ Updated: ${updated}`);
    logger.log(`   ⏭️  Skipped: ${skipped}`);
    logger.log(`   📊 Total: ${Object.keys(MODEL_PHOTOS).length}`);
    logger.log('===========================================');
    logger.log('');
    logger.log(`📸 Images URL prefix: ${baseUrl}`);
    logger.log('🌐 Test image: http://localhost:3001/images_tst/2.jpg');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Photos seed failed:', error);
    await sql.end();
    process.exit(1);
  }
}

seed();

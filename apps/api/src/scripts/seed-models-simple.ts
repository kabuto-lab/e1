/**
 * Simple Seed Script - Populate database with 13 models
 * Uses existing database schema columns only
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/seed-models-simple.ts
 */

import * as dotenv from 'dotenv';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

dotenv.config();

const MODELS_DATA = [
  {
    displayName: 'Юлианна',
    slug: 'yulianna',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.9,
    about: 'Привет! Я люблю искусство, путешествия и новые впечатления.',
    psychotypeTags: ['romantic', 'adaptable'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 22, height: 168, weight: 52, bodyType: 'fit' },
  },
  {
    displayName: 'Виктория',
    slug: 'viktoria',
    eliteStatus: true,
    verificationStatus: 'verified',
    rating: 5.0,
    about: 'Изысканная и элегантная. Ценю красоту в деталях.',
    psychotypeTags: ['sophisticated', 'gentle'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 25, height: 172, weight: 55, bodyType: 'curvy' },
  },
  {
    displayName: 'Алина',
    slug: 'alina',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.7,
    about: 'Энергичная и жизнерадостная. Увлекаюсь фитнесом и йогой.',
    psychotypeTags: ['active', 'cheerful'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 23, height: 165, weight: 50, bodyType: 'slim' },
  },
  {
    displayName: 'София',
    slug: 'sofia',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.8,
    about: 'Загадочная и страстная. Живу в Дубае.',
    psychotypeTags: ['mysterious', 'passionate'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 24, height: 170, weight: 54, bodyType: 'fit' },
  },
  {
    displayName: 'Наталья',
    slug: 'natalia',
    eliteStatus: true,
    verificationStatus: 'verified',
    rating: 4.9,
    about: 'Уверенная и харизматичная. Бизнес-леди с тонкой душой.',
    psychotypeTags: ['confident', 'sophisticated'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 27, height: 175, weight: 58, bodyType: 'curvy' },
  },
  {
    displayName: 'Елена',
    slug: 'elena',
    eliteStatus: false,
    verificationStatus: 'pending',
    rating: 4.6,
    about: 'Нежная и романтичная. Студентка, мечтаю о большом мире.',
    psychotypeTags: ['romantic', 'gentle'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 21, height: 163, weight: 48, bodyType: 'slim' },
  },
  {
    displayName: 'Мария',
    slug: 'maria',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.8,
    about: 'Амбициозная и целеустремленная. Живу в Лондоне.',
    psychotypeTags: ['ambitious', 'adaptable'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 26, height: 170, weight: 55, bodyType: 'fit' },
  },
  {
    displayName: 'Анастасия',
    slug: 'anastasia',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.7,
    about: 'Игривая и непосредственная. Верю в магию моментов.',
    psychotypeTags: ['playful', 'active'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 22, height: 167, weight: 51, bodyType: 'slim' },
  },
  {
    displayName: 'Ксения',
    slug: 'ksenia',
    eliteStatus: true,
    verificationStatus: 'verified',
    rating: 5.0,
    about: 'Роскошная и утонченная. Знаю цену прекрасному.',
    psychotypeTags: ['luxurious', 'sophisticated'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 24, height: 173, weight: 56, bodyType: 'fit' },
  },
  {
    displayName: 'Ольга',
    slug: 'olga',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.8,
    about: 'Мудрая и опытная. Ценю глубину отношений.',
    psychotypeTags: ['wise', 'gentle'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 28, height: 176, weight: 59, bodyType: 'curvy' },
  },
  {
    displayName: 'Дарья',
    slug: 'daria',
    eliteStatus: false,
    verificationStatus: 'pending',
    rating: 4.6,
    about: 'Творческая и вдохновляющая. Ищу красоту в мелочах.',
    psychotypeTags: ['creative', 'romantic'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 23, height: 169, weight: 53, bodyType: 'slim' },
  },
  {
    displayName: 'Екатерина',
    slug: 'ekaterina',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.9,
    about: 'Стильная и современная. Следую трендам.',
    psychotypeTags: ['stylish', 'adaptable'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 25, height: 171, weight: 54, bodyType: 'fit' },
  },
  {
    displayName: 'Ирина',
    slug: 'irina',
    eliteStatus: false,
    verificationStatus: 'verified',
    rating: 4.7,
    about: 'Страстная и темпераментная. Живу эмоциями.',
    psychotypeTags: ['passionate', 'active'],
    languages: ['ru', 'en'],
    physicalAttributes: { age: 26, height: 174, weight: 57, bodyType: 'curvy' },
  },
];

async function seed() {
  const logger = console;

  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  logger.log('🌱 Starting simple models seed...');

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    logger.log('✅ Connected to database');

    let created = 0;
    let skipped = 0;

    for (const modelData of MODELS_DATA) {
      // Check if exists
      const existing = await sql`
        SELECT id FROM model_profiles WHERE slug = ${modelData.slug}
      `;

      if (existing.length > 0) {
        logger.log(`⏭️  Skipped: ${modelData.displayName}`);
        skipped++;
        continue;
      }

      // Insert with existing columns only
      const psychotypeArray = '{' + (modelData.psychotypeTags || []).join(',') + '}';
      const languagesArray = '{' + (modelData.languages || []).join(',') + '}';

      const result = await sql`
        INSERT INTO model_profiles (
          display_name, slug, elite_status, verification_status,
          psychotype_tags, languages, physical_attributes,
          biography, availability_status, rating_avg,
          is_published, created_at, updated_at
        ) VALUES (
          ${modelData.displayName},
          ${modelData.slug},
          ${modelData.eliteStatus},
          ${modelData.verificationStatus},
          ${psychotypeArray},
          ${languagesArray},
          ${sql.json(modelData.physicalAttributes)},
          ${modelData.about},
          ${'online'},
          ${modelData.rating.toString()},
          true,
          NOW(),
          NOW()
        )
        RETURNING id, display_name, slug
      `;

      logger.log(`✅ Created: ${modelData.displayName} (${modelData.slug})`);
      created++;
    }

    logger.log('===========================================');
    logger.log(`🎉 Seed completed!`);
    logger.log(`   ✅ Created: ${created}`);
    logger.log(`   ⏭️  Skipped: ${skipped}`);
    logger.log(`   📊 Total: ${MODELS_DATA.length}`);
    logger.log('===========================================');

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Seed failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

seed();

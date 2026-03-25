/**
 * Seed Script - Populate database with 13 models from catalog.html
 * 
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/seed-models.ts
 */

import * as dotenv from 'dotenv';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

dotenv.config();

const MODELS_DATA = [
  {
    displayName: 'Юлианна',
    slug: 'yulianna',
    age: 22,
    height: 168,
    weight: 52,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Москва',
    rating: 4.9,
    about: 'Привет! Я люблю искусство, путешествия и новые впечатления. Индивидуальный подход к каждому свиданию.',
    psychotypeTags: ['romantic', 'adaptable'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Виктория',
    slug: 'viktoria',
    age: 25,
    height: 172,
    weight: 55,
    eliteStatus: true,
    verificationStatus: 'verified',
    location: 'Санкт-Петербург',
    rating: 5.0,
    about: 'Изысканная и элегантная. Ценю красоту в деталях. Люблю театр, вино и долгие прогулки.',
    psychotypeTags: ['sophisticated', 'gentle'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Алина',
    slug: 'alina',
    age: 23,
    height: 165,
    weight: 50,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Москва',
    rating: 4.7,
    about: 'Энергичная и жизнерадостная. Увлекаюсь фитнесом и йогой. Люблю спонтанные приключения.',
    psychotypeTags: ['active', 'cheerful'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'София',
    slug: 'sofia',
    age: 24,
    height: 170,
    weight: 54,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Дубай',
    rating: 4.8,
    about: 'Загадочная и страстная. Живу в Дубае, наслаждаюсь роскошью пустыни.',
    psychotypeTags: ['mysterious', 'passionate'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Наталья',
    slug: 'natalia',
    age: 27,
    height: 175,
    weight: 58,
    eliteStatus: true,
    verificationStatus: 'verified',
    location: 'Москва',
    rating: 4.9,
    about: 'Уверенная и харизматичная. Бизнес-леди с тонкой душой. Люблю искусство, моду и интеллектуальные беседы.',
    psychotypeTags: ['confident', 'sophisticated'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Елена',
    slug: 'elena',
    age: 21,
    height: 163,
    weight: 48,
    eliteStatus: false,
    verificationStatus: 'pending',
    location: 'Санкт-Петербург',
    rating: 4.6,
    about: 'Нежная и романтичная. Студентка, мечтаю о большом мире. Люблю поэзию и белые ночи Петербурга.',
    psychotypeTags: ['romantic', 'gentle'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Мария',
    slug: 'maria',
    age: 26,
    height: 170,
    weight: 55,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Лондон',
    rating: 4.8,
    about: 'Амбициозная и целеустремленная. Живу в Лондоне, ценю качество во всем.',
    psychotypeTags: ['ambitious', 'adaptable'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Анастасия',
    slug: 'anastasia',
    age: 22,
    height: 167,
    weight: 51,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Москва',
    rating: 4.7,
    about: 'Игривая и непосредственная. Верю в магию моментов. Люблю танцы, музыку и яркие впечатления.',
    psychotypeTags: ['playful', 'active'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Ксения',
    slug: 'ksenia',
    age: 24,
    height: 173,
    weight: 56,
    eliteStatus: true,
    verificationStatus: 'verified',
    location: 'Дубай',
    rating: 5.0,
    about: 'Роскошная и утонченная. Знаю цену прекрасному. Люблю яхты, шампанское и закаты в пустыне.',
    psychotypeTags: ['luxurious', 'sophisticated'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Ольга',
    slug: 'olga',
    age: 28,
    height: 176,
    weight: 59,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Санкт-Петербург',
    rating: 4.8,
    about: 'Мудрая и опытная. Ценю глубину отношений. Люблю классическую музыку и литературу.',
    psychotypeTags: ['wise', 'gentle'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Дарья',
    slug: 'daria',
    age: 23,
    height: 169,
    weight: 53,
    eliteStatus: false,
    verificationStatus: 'pending',
    location: 'Москва',
    rating: 4.6,
    about: 'Творческая и вдохновляющая. Ищу красоту в мелочах. Люблю фотографию и выставки.',
    psychotypeTags: ['creative', 'romantic'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Екатерина',
    slug: 'ekaterina',
    age: 25,
    height: 171,
    weight: 54,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Лондон',
    rating: 4.9,
    about: 'Стильная и современная. Следую трендам, но ценю классику. Люблю моду и дизайн.',
    psychotypeTags: ['stylish', 'adaptable'],
    languages: ['ru', 'en'],
  },
  {
    displayName: 'Ирина',
    slug: 'irina',
    age: 26,
    height: 174,
    weight: 57,
    eliteStatus: false,
    verificationStatus: 'verified',
    location: 'Дубай',
    rating: 4.7,
    about: 'Страстная и темпераментная. Живу эмоциями. Люблю танцы, вечеринки и незабываемые ночи.',
    psychotypeTags: ['passionate', 'active'],
    languages: ['ru', 'en'],
  },
];

async function seed() {
  const logger = console;
  
  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }
  
  logger.log('🌱 Starting models seed...');
  
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  
  try {
    logger.log('✅ Connected to database');
    
    let created = 0;
    let skipped = 0;
    
    for (const modelData of MODELS_DATA) {
      // Check if model with this slug already exists
      const existing = await sql`
        SELECT id, display_name FROM model_profiles WHERE slug = ${modelData.slug}
      `;
      
      if (existing.length > 0) {
        logger.log(`⏭️  Skipped: ${modelData.displayName} (already exists)`);
        skipped++;
        continue;
      }
      
      const physicalAttributes = {
        age: modelData.age,
        height: modelData.height,
        weight: modelData.weight,
        bodyType: 'fit',
        bustType: 'natural',
        temperament: 'active',
        sexuality: 'active',
      };
      
      // Insert new profile
      const result = await sql`
        INSERT INTO model_profiles (
          display_name, slug, elite_status, verification_status,
          psychotype_tags, languages, physical_attributes,
          biography, availability_status, rating_reliability,
          is_published, published_at, created_at, updated_at
        ) VALUES (
          ${modelData.displayName},
          ${modelData.slug},
          ${modelData.eliteStatus},
          ${modelData.verificationStatus},
          ${sql.json(modelData.psychotypeTags || [])},
          ${sql.json(modelData.languages || [])},
          ${sql.json(physicalAttributes)},
          ${modelData.about},
          ${'online'},
          ${modelData.rating.toString()},
          true,
          NOW(),
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
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    await sql.end();
    process.exit(1);
  }
}

seed();

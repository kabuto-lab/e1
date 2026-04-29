import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const MODELS = [
  { displayName: 'Юлианна', slug: 'yulianna', age: 22, height: 168, weight: 52, elite: false, verification: 'verified', rating: 4.9, about: 'Привет! Я люблю искусство, путешествия и новые впечатления. Индивидуальный подход к каждому свиданию.', tags: ['romantic','adaptable'], photo: 'photo-1544005313-94ddf0286df2' },
  { displayName: 'Виктория', slug: 'viktoria', age: 25, height: 172, weight: 55, elite: true, verification: 'verified', rating: 5.0, about: 'Изысканная и элегантная. Ценю красоту в деталях. Люблю театр, вино и долгие прогулки.', tags: ['sophisticated','gentle'], photo: 'photo-1534528741775-53994a69daeb' },
  { displayName: 'Алина', slug: 'alina', age: 23, height: 165, weight: 50, elite: false, verification: 'verified', rating: 4.7, about: 'Энергичная и жизнерадостная. Увлекаюсь фитнесом и йогой. Люблю спонтанные приключения.', tags: ['active','cheerful'], photo: 'photo-1524504388940-b1c1722653e1' },
  { displayName: 'София', slug: 'sofia', age: 24, height: 170, weight: 54, elite: false, verification: 'verified', rating: 4.8, about: 'Загадочная и страстная. Живу в Дубае, наслаждаюсь роскошью пустыни.', tags: ['mysterious','passionate'], photo: 'photo-1531746020798-e6953c6e8e04' },
  { displayName: 'Наталья', slug: 'natalia', age: 27, height: 175, weight: 58, elite: true, verification: 'verified', rating: 4.9, about: 'Уверенная и харизматичная. Бизнес-леди с тонкой душой. Люблю искусство, моду и интеллектуальные беседы.', tags: ['confident','sophisticated'], photo: 'photo-1529626455594-4ff0802cfb7e' },
  { displayName: 'Елена', slug: 'elena', age: 21, height: 163, weight: 48, elite: false, verification: 'pending', rating: 4.6, about: 'Нежная и романтичная. Студентка, мечтаю о большом мире. Люблю поэзию и белые ночи Петербурга.', tags: ['romantic','gentle'], photo: 'photo-1488426862026-3ee34a7d66df' },
  { displayName: 'Мария', slug: 'maria', age: 26, height: 170, weight: 55, elite: false, verification: 'verified', rating: 4.8, about: 'Амбициозная и целеустремленная. Живу в Лондоне, ценю качество во всем.', tags: ['ambitious','adaptable'], photo: 'photo-1502767089310-6d90f198c548' },
  { displayName: 'Анастасия', slug: 'anastasia', age: 22, height: 167, weight: 51, elite: false, verification: 'verified', rating: 4.7, about: 'Игривая и непосредственная. Верю в магию моментов. Люблю танцы, музыку и яркие впечатления.', tags: ['playful','active'], photo: 'photo-1464983953574-0892a716854b' },
  { displayName: 'Ксения', slug: 'ksenia', age: 24, height: 173, weight: 56, elite: true, verification: 'verified', rating: 5.0, about: 'Роскошная и утонченная. Знаю цену прекрасному. Люблю яхты, шампанское и закаты в пустыне.', tags: ['luxurious','sophisticated'], photo: 'photo-1517841905240-472988babdf9' },
  { displayName: 'Ольга', slug: 'olga', age: 28, height: 176, weight: 59, elite: false, verification: 'verified', rating: 4.8, about: 'Мудрая и опытная. Ценю глубину отношений. Люблю классическую музыку и литературу.', tags: ['wise','gentle'], photo: 'photo-1508214751196-bcfd4ca60f91' },
  { displayName: 'Дарья', slug: 'daria', age: 23, height: 169, weight: 53, elite: false, verification: 'pending', rating: 4.6, about: 'Творческая и вдохновляющая. Ищу красоту в мелочах. Люблю фотографию и выставки.', tags: ['creative','romantic'], photo: 'photo-1519699047748-de8e457a634e' },
  { displayName: 'Екатерина', slug: 'ekaterina', age: 25, height: 171, weight: 54, elite: false, verification: 'verified', rating: 4.9, about: 'Стильная и современная. Следую трендам, но ценю классику. Люблю моду и дизайн.', tags: ['stylish','adaptable'], photo: 'photo-1506794778202-cad84cf45f1d' },
  { displayName: 'Ирина', slug: 'irina', age: 26, height: 174, weight: 57, elite: false, verification: 'verified', rating: 4.7, about: 'Страстная и темпераментная. Живу эмоциями. Люблю танцы, вечеринки и незабываемые ночи.', tags: ['passionate','active'], photo: 'photo-1521119989659-a83eee488004' },
];

// Using Unsplash direct URLs (no download needed)
const photoBase = 'https://images.unsplash.com/';
const photoParams = '?w=600&h=800&fit=crop&auto=format&q=80';

let created = 0, updated = 0, skipped = 0;

for (const m of MODELS) {
  const photoUrl = `${photoBase}${m.photo}${photoParams}`;
  const physicalAttributes = { age: m.age, height: m.height, weight: m.weight, bodyType: 'fit', bustType: 'natural', temperament: 'active', sexuality: 'active' };

  const existing = await sql`SELECT id, main_photo_url FROM model_profiles WHERE slug = ${m.slug}`;

  if (existing.length > 0) {
    const row = existing[0];
    if (!row.main_photo_url) {
      await sql`UPDATE model_profiles SET main_photo_url = ${photoUrl}, updated_at = NOW() WHERE id = ${row.id}`;
      console.log(`📸 Photo added: ${m.displayName}`);
      updated++;
    } else {
      console.log(`⏭  Skipped: ${m.displayName} (exists)`);
      skipped++;
    }
    continue;
  }

  await sql`
    INSERT INTO model_profiles (
      display_name, slug, elite_status, verification_status,
      psychotype_tags, languages, physical_attributes,
      biography, availability_status, rating_reliability,
      is_published, published_at, main_photo_url, created_at, updated_at
    ) VALUES (
      ${m.displayName}, ${m.slug}, ${m.elite}, ${m.verification},
      ${sql.json(m.tags)}, ${sql.json(['ru','en'])}, ${sql.json(physicalAttributes)},
      ${m.about}, ${'online'}, ${String(m.rating)},
      true, NOW(), ${photoUrl}, NOW(), NOW()
    )
  `;
  console.log(`✅ Created: ${m.displayName}`);
  created++;
}

console.log(`\n🎉 Done! Created: ${created}, Photos added: ${updated}, Skipped: ${skipped}`);
await sql.end();

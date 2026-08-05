/**
 * Seed 2 тестовых менеджера + по 2 модели у каждого — для проверки группировки
 * на /dashboard/users («Доли»/группы по менеджеру).
 *
 * Запуск: npx ts-node -r tsconfig-paths/register src/scripts/seed-test-managers-models.ts
 * Идемпотентно: логины фиксированные, при повторном запуске существующие строки не дублирует.
 */

import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { resolve } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

for (let depth = 0; depth < 8; depth++) {
  const envPath = resolve(__dirname, ...Array(depth).fill('..'), '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

const MANAGERS = [
  { login: 'test_manager1', displayModels: ['Тестовая модель 1', 'Тестовая модель 2'] },
  { login: 'test_manager2', displayModels: ['Тестовая модель 3', 'Тестовая модель 4'] },
];
const PASSWORD = 'Test123!';

async function upsertLoginUser(
  sql: any,
  login: string,
  role: 'manager' | 'model',
  passwordHash: string,
): Promise<string> {
  const existing = await sql`SELECT id FROM users WHERE login = ${login}`;
  if (existing.length > 0) {
    console.log(`⏭️  ${login} (${role}) уже существует — ${existing[0].id}`);
    return existing[0].id;
  }
  const phone = `+7900${Math.floor(1000000 + Math.random() * 8999999)}`;
  const phoneHash = createHash('sha256').update(phone).digest('hex');
  const result = await sql`
    INSERT INTO users (login, phone, phone_hash, password_hash, role, status, created_at)
    VALUES (${login}, ${phone}, ${phoneHash}, ${passwordHash}, ${role}, 'active', NOW())
    RETURNING id
  `;
  console.log(`✅ ${login} (${role}) создан — ${result[0].id}`);
  return result[0].id;
}

async function upsertModelProfile(
  sql: any,
  userId: string,
  managerId: string,
  displayName: string,
  slug: string,
): Promise<void> {
  const existing = await sql`SELECT id FROM model_profiles WHERE user_id = ${userId}`;
  if (existing.length > 0) {
    console.log(`⏭️  Анкета для ${displayName} уже существует — ${existing[0].id}`);
    return;
  }
  const id = randomUUID();
  await sql`
    INSERT INTO model_profiles (
      id, user_id, manager_id, display_name, slug, verification_status,
      is_published, rate_hourly, availability_status, created_at, updated_at
    )
    VALUES (
      ${id}, ${userId}, ${managerId}, ${displayName}, ${slug}, 'verified',
      true, '5000.00', 'online', NOW(), NOW()
    )
  `;
  console.log(`✅ Анкета «${displayName}» создана — ${id}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    let modelIndex = 0;

    for (const mgr of MANAGERS) {
      const managerId = await upsertLoginUser(sql, mgr.login, 'manager', passwordHash);

      for (const displayName of mgr.displayModels) {
        modelIndex += 1;
        const modelLogin = `test_model${modelIndex}`;
        const slug = `test-model-${modelIndex}`;
        const modelUserId = await upsertLoginUser(sql, modelLogin, 'model', passwordHash);
        await upsertModelProfile(sql, modelUserId, managerId, displayName, slug);
      }
    }

    console.log('\nГотово. Логин/пароль для всех тестовых аккаунтов:');
    console.log(`  Пароль: ${PASSWORD}`);
    console.log('  Менеджеры: test_manager1, test_manager2');
    console.log('  Модели: test_model1, test_model2, test_model3, test_model4');

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

main();

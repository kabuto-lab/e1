/* eslint-disable no-console */
/**
 * Утилита: создать ОДНОГО platform-admin (users + platform_admins), без сидинга тенантов.
 * Идемпотентно: если пользователь с таким email уже есть — переиспользуем его и
 * только добавляем platform_admins-связь (если её нет). Пароль НЕ перезаписывает
 * существующего пользователя.
 *
 * Запуск (из корня SITE1):
 *   npm run create:admin -- <email> <password> ["Имя"]
 *   # или через env:
 *   NEW_ADMIN_EMAIL=... NEW_ADMIN_PASSWORD=... npm run create:admin
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { getDb, closeDb, users, platformAdmins } from '@barbie-site1/db';

function loadEnv(): void {
  const cwd = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const base = depth === 0 ? cwd : resolve(cwd, ...Array(depth).fill('..'));
    const envPath = resolve(base, '.env');
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false });
      return;
    }
  }
}
loadEnv();

const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[create:admin] DATABASE_URL не задан — нужен .env');
    process.exit(1);
  }

  const email = (process.argv[2] ?? process.env.NEW_ADMIN_EMAIL ?? '').toLowerCase().trim();
  const password = process.argv[3] ?? process.env.NEW_ADMIN_PASSWORD ?? '';
  const name = process.argv[4] ?? process.env.NEW_ADMIN_NAME ?? 'Администратор';

  if (!email || !password) {
    console.error('[create:admin] укажи email и пароль:');
    console.error('  npm run create:admin -- <email> <password> ["Имя"]');
    process.exit(1);
  }

  const db = getDb();

  // 1. users
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  let userId: string;
  let userCreated = false;
  if (existing) {
    userId = existing.id;
    console.log(`· user уже существует: ${email} (пароль не меняю)`);
  } else {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [created] = await db
      .insert(users)
      .values({ email, passwordHash: hash, name, status: 'active' })
      .returning({ id: users.id });
    userId = created.id;
    userCreated = true;
    console.log(`✓ user создан: ${email}`);
  }

  // 2. platform_admins
  const [link] = await db
    .select({ id: platformAdmins.id })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);
  if (link) {
    console.log('· platform_admins-связь уже есть');
  } else {
    await db.insert(platformAdmins).values({ userId, role: 'platform-admin' });
    console.log('✓ platform_admins-связь создана (role=platform-admin)');
  }

  console.log('━'.repeat(56));
  console.log(' Готово. Вход в админку NAS:');
  console.log(`   email:    ${email}`);
  if (userCreated) console.log(`   password: ${password}`);
  else console.log('   password: (без изменений — пользователь уже был)');
  console.log('━'.repeat(56));
}

main()
  .catch((err) => {
    console.error('[create:admin] FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });

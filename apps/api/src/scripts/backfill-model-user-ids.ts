/**
 * Backfill: создать аккаунт (users, role='model') для каждой анкеты model_profiles
 * с user_id IS NULL — обязательно ПЕРЕД миграцией 0026_dizzy_firestar (делает
 * model_profiles.user_id NOT NULL). Идемпотентно: трогает только NULL-строки,
 * безопасно перезапускать.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/backfill-model-user-ids.ts
 */

import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
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

const LOGIN_ALPHABET = '23456789';
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomFrom(alphabet: string, length: number): string {
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function backfill() {
  const logger = console;

  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    const orphaned = await sql`
      SELECT id, display_name, slug FROM model_profiles WHERE user_id IS NULL
    `;

    if (orphaned.length === 0) {
      logger.log('✅ Нет анкет без аккаунта — можно накатывать миграцию 0026.');
      await sql.end();
      process.exit(0);
    }

    logger.log(`Найдено анкет без аккаунта: ${orphaned.length}`);

    for (const profile of orphaned) {
      const base = (profile.slug || profile.display_name || 'model')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 20) || 'model';

      let login = base;
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = attempt === 0 ? base : `${base}-${randomFrom(LOGIN_ALPHABET, 4)}`;
        const existing = await sql`
          SELECT id FROM users WHERE lower(login) = lower(${candidate}) LIMIT 1
        `;
        if (existing.length === 0) {
          login = candidate;
          break;
        }
        if (attempt === 19) {
          throw new Error(`Не удалось подобрать уникальный логин для анкеты ${profile.id}`);
        }
      }

      const password = randomFrom(PASSWORD_ALPHABET, 12);
      const passwordHash = await bcrypt.hash(password, 10);

      let recoveryCode = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        const raw = randomFrom(RECOVERY_ALPHABET, 8);
        const candidate = `${raw.slice(0, 4)}-${raw.slice(4)}`;
        const existing = await sql`SELECT id FROM users WHERE recovery_code = ${candidate} LIMIT 1`;
        if (existing.length === 0) {
          recoveryCode = candidate;
          break;
        }
      }
      if (!recoveryCode) {
        throw new Error(`Не удалось сгенерировать recovery_code для анкеты ${profile.id}`);
      }

      const [user] = await sql`
        INSERT INTO users (login, password_hash, recovery_code, initial_password, role, status, created_at)
        VALUES (${login}, ${passwordHash}, ${recoveryCode}, ${password}, 'model', 'active', NOW())
        RETURNING id
      `;

      await sql`UPDATE model_profiles SET user_id = ${user.id} WHERE id = ${profile.id}`;

      logger.log(`✅ ${profile.display_name} (${profile.id}) → login=${login} password=${password}`);
    }

    logger.log('Готово. Теперь можно накатывать миграцию 0026_dizzy_firestar.');
    await sql.end();
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Backfill failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

backfill();

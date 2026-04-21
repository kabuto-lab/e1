/**
 * Seed Client User — создаёт дефолтного email+password клиента для dev/e2e.
 *
 * Запуск: npx ts-node -r tsconfig-paths/register src/scripts/seed-client.ts
 * Или через workspace: npm run seed:client --workspace=@escort/api
 *
 * Идемпотентно: если клиент с таким email_hash уже есть — выходит без ошибок.
 * Используется в db:bootstrap после create-admin, чтобы после `docker down -v +
 * db:bootstrap` сразу был рабочий client для /auth/login без ручного /auth/register.
 */

import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
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

const CLIENT_EMAIL = 'client@lovnge.local';
const CLIENT_PASSWORD = 'Client123!';

async function seedClient() {
  const logger = console;

  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  logger.log('👤 Seeding client user...');

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    const emailHash = require('crypto')
      .createHash('sha256')
      .update(CLIENT_EMAIL.toLowerCase())
      .digest('hex');

    const passwordHash = await bcrypt.hash(CLIENT_PASSWORD, 10);

    const existing = await sql`
      SELECT id, role, status FROM users WHERE email_hash = ${emailHash}
    `;

    if (existing.length > 0) {
      // Reset password + status — сид должен давать предсказуемое состояние для dev/e2e.
      await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, status = 'active', role = 'client'
        WHERE email_hash = ${emailHash}
      `;
      logger.log(
        `🔄  Client user already existed (${existing[0].id}); password + status reset to active`,
      );
    } else {
      const result = await sql`
        INSERT INTO users (email_hash, password_hash, role, status, created_at)
        VALUES (
          ${emailHash},
          ${passwordHash},
          'client',
          'active',
          NOW()
        )
        RETURNING id, role, status
      `;
      logger.log(`✅ Client user created (${result[0].id})`);
    }

    logger.log(`   Email: ${CLIENT_EMAIL}`);
    logger.log(`   Password: ${CLIENT_PASSWORD}`);

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Failed to seed client:', error.message);
    await sql.end();
    process.exit(1);
  }
}

seedClient();

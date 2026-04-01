/**
 * Create Admin User Script
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts
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

async function createAdmin() {
  const logger = console;

  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  logger.log('🔐 Creating admin user...');

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    // Check if admin already exists
    const existing = await sql`
      SELECT id, email_hash, role FROM users WHERE role = 'admin'
    `;

    if (existing.length > 0) {
      logger.log('⏭️  Admin user already exists');
      await sql.end();
      process.exit(0);
    }

    // Hash password
    const email = 'admin@lovnge.local';
    const password = 'Admin123!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Create email hash (simplified - in production use proper hash)
    const emailHash = require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex');

    logger.log('Email hash:', emailHash);

    // Insert admin user
    const result = await sql`
      INSERT INTO users (email_hash, password_hash, role, status, created_at)
      VALUES (
        ${emailHash},
        ${passwordHash},
        'admin',
        'active',
        NOW()
      )
      RETURNING id, email_hash, role, status
    `;

    logger.log('✅ Admin user created successfully!');
    logger.log('   Email: admin@lovnge.local');
    logger.log('   Password: Admin123!');
    logger.log('   ID:', result[0].id);

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Failed to create admin:', error.message);
    await sql.end();
    process.exit(1);
  }
}

createAdmin();

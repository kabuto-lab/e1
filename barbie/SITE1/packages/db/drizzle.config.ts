import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'node:path';

// .env лежит в корне SITE1 (на 2 уровня выше: packages/db → SITE1)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
} satisfies Config;

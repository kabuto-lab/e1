/**
 * Environment Variables Validation Schema
 * 
 * Uses Zod to validate all environment variables at application startup.
 * Prevents the application from starting with missing or invalid configuration.
 * 
 * @see https://docs.nestjs.com/techniques/configuration
 */

import { z } from 'zod';

/**
 * Environment schema for production-grade validation
 */
export const envSchema = z.object({
  // ============================================
  // NODE ENVIRONMENT
  // ============================================
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),

  // ============================================
  // DATABASE (PostgreSQL)
  // ============================================
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://', {
      message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    }),

  // ============================================
  // JWT CONFIGURATION
  // ============================================
  JWT_SECRET: z
    .string()
    .min(32, { message: 'JWT_SECRET must be at least 32 characters' })
    .regex(/^[a-f0-9]{64}$/i, {
      message: 'JWT_SECRET must be a 64-character hex string (32 bytes / 256-bit)',
    }),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' }),

  JWT_ACCESS_EXPIRATION: z
    .string()
    .default('15m'),

  JWT_REFRESH_EXPIRATION: z
    .string()
    .default('7d'),

  // ============================================
  // ENCRYPTION (for sensitive PII)
  // ============================================
  ENCRYPTION_KEY: z
    .string()
    .length(64, {
      message: 'ENCRYPTION_KEY must be exactly 64 characters (32 bytes / 256-bit AES)',
    })
    .regex(/^[a-f0-9]{64}$/i),

  // ============================================
  // REDIS (sessions/cache)
  // ============================================
  REDIS_URL: z
    .string()
    .url()
    .startsWith('redis://', {
      message: 'REDIS_URL must be a valid Redis connection string',
    }),

  // ============================================
  // MINIO / S3 (file storage)
  // ============================================
  MINIO_ENDPOINT: z
    .string()
    .min(1, { message: 'MINIO_ENDPOINT is required' }),

  /** Host:port reachable from the browser for presigned PUT (e.g. VPS IP:9000). If omitted, MINIO_ENDPOINT is used (localhost breaks remote uploads). */
  MINIO_PRESIGN_ENDPOINT: z.string().min(1).optional(),

  MINIO_ACCESS_KEY: z
    .string()
    .min(8, { message: 'MINIO_ACCESS_KEY must be at least 8 characters' }),

  MINIO_SECRET_KEY: z
    .string()
    .min(16, { message: 'MINIO_SECRET_KEY must be at least 16 characters' }),

  MINIO_BUCKET: z
    .string()
    .default('escort-media'),

  MINIO_PUBLIC_URL: z
    .string()
    .url()
    .optional(),

  // ============================================
  // API SERVER
  // ============================================
  PORT: z
    .string()
    .default('3000'),

  API_URL: z
    .string()
    .url()
    .optional(),

  FRONTEND_URL: z
    .string()
    .url()
    .default('http://localhost:3001'),

  // ============================================
  // CORS (allowed origins)
  // ============================================
  ALLOWED_ORIGINS: z
    .string()
    .default('http://127.0.0.1:3001'),

  // ============================================
  // RATE LIMITING
  // ============================================
  RATE_LIMIT_TTL: z
    .string()
    .default('60'),

  RATE_LIMIT_MAX: z
    .string()
    .default('100'),

  // ============================================
  // 152-ФЗ COMPLIANCE (Russian data protection)
  // ============================================
  DATA_REGION: z
    .enum(['ru', 'eu', 'global'])
    .default('ru'),

  AUDIT_LOG_RETENTION_DAYS: z
    .string()
    .default('1825'),

  // ============================================
  // EMAIL (SMTP)
  // ============================================
  SMTP_HOST: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(1).optional(),
  ),

  SMTP_PORT: z
    .string()
    .default('587'),

  /** Адрес или "Имя <email>" — zod .email() ломались на display name и на .local */
  SMTP_FROM: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : typeof v === 'string' ? v.trim() : v),
    z
      .string()
      .min(3)
      .max(200)
      .optional()
      .refine(
        (s) =>
          s === undefined ||
          /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/i.test(s) ||
          /^[^<]{0,120}<\s*[^\s@]+@[^\s@.]+(\.[^\s@.]+)+\s*>$/i.test(s),
        { message: 'SMTP_FROM: укажите email или формат "Имя <email@домен>"' },
      ),
  ),

  SMTP_USER: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional(),
  ),

  SMTP_PASS: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional(),
  ),

  /** true = TLS (порт 465); иначе STARTTLS или без шифрования (Mailhog) */
  SMTP_SECURE: z.enum(['true', 'false']).optional(),

  /** Куда уходит письмо с формы «Контакты» */
  CONTACT_FORM_TO_EMAIL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : typeof v === 'string' ? v.trim() : v),
    z.string().email().optional(),
  ),

  // ============================================
  // TELEGRAM BOT
  // ============================================
  TELEGRAM_BOT_TOKEN: z
    .string()
    .optional(),

  // ============================================
  // PAYMENT GATEWAYS
  // ============================================
  YOOKASSA_SHOP_ID: z
    .string()
    .optional(),

  YOOKASSA_SECRET_KEY: z
    .string()
    .optional(),

  CRYPTOMUS_API_KEY: z
    .string()
    .optional(),

  CRYPTOMUS_MERCHANT_ID: z
    .string()
    .optional(),

  // ============================================
  // TON USDT escrow (optional; без них POST /escrow/ton/intent вернёт 503)
  // ============================================
  TON_NETWORK: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.enum(['ton_mainnet', 'ton_testnet']).optional(),
  ),

  TON_USDT_JETTON_MASTER: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(10).optional(),
  ),

  TON_TREASURY_ADDRESS: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(10).optional(),
  ),

  /** Секрет для POST /escrow/ton/deposit (заголовок x-ton-escrow-ingest), мин. 16 символов */
  TON_ESCROW_INGEST_SECRET: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(16).optional(),
  ),

  /** Фоновый опрос TonAPI → recordDeposit (true / не задавать) */
  TON_INDEXER_ENABLED: z.enum(['true', 'false']).optional(),

  /** Интервал опроса TonAPI, мс (мин. 5000 в коде) */
  TON_INDEXER_POLL_MS: z.string().optional(),

  /** Событий за запрос (1–100, по умолчанию 50) */
  TON_INDEXER_EVENTS_LIMIT: z.string().optional(),

  /** Начальный курсор logical time (после первого деплоя без БД) */
  TON_INDEXER_BOOTSTRAP_AFTER_LT: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().regex(/^\d+$/).optional(),
  ),

  TONAPI_BASE_URL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().optional(),
  ),

  TONAPI_KEY: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional(),
  ),

  /** Hot wallet: мнемоника WalletContractV4 wc0, адрес = TON_TREASURY_ADDRESS */
  TON_HOT_WALLET_MNEMONIC: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(32).optional(),
  ),

  TON_RPC_ENDPOINT: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().optional(),
  ),

  TON_RPC_API_KEY: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional(),
  ),

  TON_JETTON_GAS_NANOTONS: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().regex(/^\d+$/).optional(),
  ),

  TON_JETTON_FORWARD_NANOTONS: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().regex(/^\d+$/).optional(),
  ),
});

/**
 * Type inference from schema
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment configuration
 * 
 * @param config - Raw environment variables from process.env
 * @returns Validated and parsed configuration
 * @throws {Error} If validation fails
 * 
 * @example
 * // In main.ts
 * const config = validateEnv(process.env);
 * logger.log(`Running in ${config.NODE_ENV} mode`);
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Environment validation failed:');
    console.error('');

    result.error.issues.forEach((issue: any) => {
      const path = issue.path.join('.');
      console.error(`  • ${path}: ${issue.message}`);
    });
    
    console.error('');
    console.error('Please check your .env file and ensure all required variables are set correctly.');
    console.error('');
    console.error('Quick fix: Copy .env.example to .env and fill in the values:');
    console.error('  cp .env.example .env');
    console.error('');
    console.error('Generate secure secrets:');
    console.error('  # JWT Secret (256-bit)');
    console.error('  openssl rand -hex 32');
    console.error('');
    console.error('  # Encryption Key (256-bit AES)');
    console.error('  openssl rand -hex 32');
    
    process.exit(1);
  }

  return result.data;
}

/**
 * Get a specific environment variable with type safety
 * 
 * @example
 * const jwtSecret = getEnv('JWT_SECRET');
 * const port = getEnv('PORT', '3000');
 */
export function getEnv<K extends keyof EnvConfig>(
  key: K,
  defaultValue?: EnvConfig[K]
): EnvConfig[K] {
  const value = process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value as EnvConfig[K];
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

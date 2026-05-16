/**
 * Barbie SITE1 — Configuration loader.
 *
 * Парсит process.env в типизированный объект. Подключается через ConfigModule
 * (см. app.module.ts). Используй ConfigService.get<AppConfig>() для доступа.
 *
 * Все необязательные переменные имеют sensible defaults для dev-окружения.
 * В prod-сборке checkRequired() выбросит ошибку до bootstrap, если не хватает критичного.
 */

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  api: {
    port: number;
    corsOrigins: string[];
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  s3: {
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    publicUrl: string;
    forcePathStyle: boolean;
  };
  tenant: {
    rootDomain: string;
    fallbackHeader: string;
  };
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

export default function configuration(): AppConfig {
  const env = (process.env.NODE_ENV ?? 'development') as AppConfig['env'];
  return {
    env,
    api: {
      port: Number(process.env.API_PORT ?? 3010),
      corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3011')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    },
    database: {
      url: process.env.DATABASE_URL ?? '',
    },
    redis: {
      url: process.env.REDIS_URL ?? 'redis://localhost:6389',
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? '',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9011',
      region: process.env.S3_REGION ?? 'us-east-1',
      accessKey: process.env.S3_ACCESS_KEY ?? '',
      secretKey: process.env.S3_SECRET_KEY ?? '',
      bucket: process.env.S3_BUCKET ?? 'barbie-media',
      publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9011/barbie-media',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    },
    tenant: {
      rootDomain: process.env.TENANT_ROOT_DOMAIN ?? 'lvh.me',
      fallbackHeader: process.env.TENANT_RESOLVE_FALLBACK_HEADER ?? 'x-tenant-slug',
    },
    logLevel: (process.env.LOG_LEVEL ?? 'info') as AppConfig['logLevel'],
  };
}

/**
 * Проверка обязательных переменных. Вызывать из main.ts до создания приложения.
 * В development допускает дефолты; в production требует все секреты.
 */
export function checkRequired(cfg: AppConfig): void {
  const errors: string[] = [];
  if (!cfg.database.url) errors.push('DATABASE_URL is required');
  if (cfg.env === 'production') {
    if (!cfg.jwt.secret) errors.push('JWT_SECRET is required in production');
    if (!cfg.jwt.refreshSecret) errors.push('JWT_REFRESH_SECRET is required in production');
    if (cfg.jwt.secret.length < 32) errors.push('JWT_SECRET must be ≥ 32 chars in production');
    if (!cfg.s3.accessKey || !cfg.s3.secretKey) errors.push('S3_ACCESS_KEY / S3_SECRET_KEY are required in production');
  }
  if (errors.length) {
    console.error('[config] missing required env:', errors.join('; '));
    process.exit(1);
  }
}

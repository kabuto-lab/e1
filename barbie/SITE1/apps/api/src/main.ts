/**
 * Barbie SITE1 API — entry point.
 *
 * Bootstrap order:
 *   1. .env load (raise above ConfigModule, чтобы process.env был готов до validateEnv)
 *   2. validate required env (DATABASE_URL, JWT_SECRET in prod)
 *   3. NestFactory.create + helmet + validation pipe + swagger
 *   4. listen на API_PORT
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import configuration, { checkRequired } from './config/configuration';

/**
 * Ищем .env вверх по дереву — потому что PM2 / Docker могут запускать процесс
 * не из директории приложения (см. ENTITY §6 — VPS-регламент).
 */
function loadRepositoryEnv(): void {
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

async function bootstrap(): Promise<void> {
  loadRepositoryEnv();

  const cfg = configuration();
  checkRequired(cfg);

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', cfg.logLevel === 'debug' ? 'debug' : 'log'],
  });

  // Безопасность
  app.use(helmet({ contentSecurityPolicy: false })); // CSP настроим точечно когда подключим web

  // CORS
  app.enableCors({
    origin: cfg.api.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // URL versioning: /v1/...
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global validation pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger / OpenAPI
  if (cfg.env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Barbie SITE1 API')
      .setDescription('Multi-tenant CRM for spa salon networks')
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(cfg.api.port);
  logger.log(`🚀 Barbie SITE1 API listening on http://localhost:${cfg.api.port}`);
  if (cfg.env !== 'production') {
    logger.log(`📚 Swagger UI: http://localhost:${cfg.api.port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Bootstrap failed:', err);
  process.exit(1);
});

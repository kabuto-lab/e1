/**
 * Escort Platform API - Main Entry Point
 * 
 * Production-grade security hardening:
 * - Environment validation at startup
 * - Helmet security headers (CSP, HSTS, XSS protection)
 * - CORS with multiple allowed origins
 * - Global validation pipe with sanitization
 * - Rate limiting (via RateLimitModule)
 * - JWT authentication (via AuthGuardsModule)
 * - Audit logging (via AuditLogger)
 * 
 * Карта модулей и данных: docs/CODEBASE_GUIDE.md
 */

import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';

/**
 * PM2 / node часто стартуют без подстановки .env в process.env.
 * validateEnv() и CORS читают process.env до ConfigModule — подгружаем корневой .env заранее.
 */
function loadRepositoryEnvFile(): void {
  const cwd = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const base = depth === 0 ? cwd : resolve(cwd, ...Array(depth).fill('..'));
    const envPath = resolve(base, '.env');
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: true });
      return;
    }
  }
}

loadRepositoryEnvFile();
import {
  ValidationPipe,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  Logger,
  VersioningType,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Response, Request } from 'express';
import { validateEnv } from './config/validation.schema';
import { getHelmetConfig } from './security/helmet.config';

function resolveHttpStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  const s = (exception as { status?: number })?.status;
  if (typeof s === 'number' && s >= 100 && s < 600) {
    return s;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function isLikelyUpstreamDown(exception: unknown): boolean {
  const seen = new Set<unknown>();
  let e: unknown = exception;
  while (e && typeof e === 'object' && !seen.has(e)) {
    seen.add(e);
    const name = (e as { name?: string })?.name;
    const msg = String((e as { errmsg?: string })?.errmsg ?? (e as { message?: string })?.message ?? '');
    if (name === 'AggregateError') return true;
    if (
      /ECONNREFUSED|ECONNRESET|ETIMEDOUT|getaddrinfo ENOTFOUND|connect ETIMEDOUT|Connection refused|ENOTFOUND|password authentication failed|28P01|the database system is starting up|database .+ does not exist|53300|57P01/i.test(
        msg,
      )
    ) {
      return true;
    }
    const code = (e as { code?: string })?.code;
    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND' || code === '28P01') return true;
    e = (e as { cause?: unknown })?.cause;
  }
  return false;
}

/** Обход цепочки cause + AggregateError.errors — для точного текста клиенту */
function hasPostgresPasswordAuthFailed(exception: unknown): boolean {
  const seen = new Set<unknown>();
  const walk = (e: unknown): boolean => {
    if (!e || typeof e !== 'object' || seen.has(e)) return false;
    seen.add(e);
    const o = e as { code?: string; errmsg?: string; message?: string; errors?: unknown[]; cause?: unknown };
    if (o.code === '28P01') return true;
    const msg = String(o.errmsg ?? o.message ?? '');
    if (/password authentication failed|28P01|invalid_password|SASL.*authentication failed/i.test(msg)) return true;
    if (Array.isArray(o.errors)) {
      for (const sub of o.errors) {
        if (walk(sub)) return true;
      }
    }
    return walk(o.cause);
  };
  return walk(exception);
}

function messageFromHttpException(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: string | string[] }).message;
    return Array.isArray(m) ? m.join('; ') : String(m);
  }
  return exception.message;
}

/**
 * Global Exception Filter with enhanced logging
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isDev = process.env.NODE_ENV === 'development';
    const upstreamUnavailableMessage = isDev
      ? 'База данных или другой сетевой сервис недоступен. Запустите Docker Desktop, затем: docker compose -f docker-compose.dev.yml up -d. Проверьте DATABASE_URL в .env.'
      : 'Сервис временно недоступен: не удаётся подключиться к базе данных или зависимостям. Убедитесь, что PostgreSQL (и при необходимости Redis/MinIO) запущены и что DATABASE_URL в окружении процесса API указывает на доступный хост и порт.';
    const dbPasswordMismatchMessage =
      'PostgreSQL отклонил подключение: пароль или пользователь в DATABASE_URL не совпадают с настройками сервера БД. Проверьте .env у процесса API и пароль роли (например ALTER USER в контейнере escort-postgres).';

    let status = resolveHttpStatus(exception);
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && isLikelyUpstreamDown(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
    }

    let clientMessage: string;
    if (exception instanceof HttpException) {
      clientMessage = messageFromHttpException(exception);
    } else if (status === HttpStatus.SERVICE_UNAVAILABLE && isLikelyUpstreamDown(exception)) {
      clientMessage = hasPostgresPasswordAuthFailed(exception)
        ? dbPasswordMismatchMessage
        : upstreamUnavailableMessage;
    } else if (status === HttpStatus.INTERNAL_SERVER_ERROR && isLikelyUpstreamDown(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      clientMessage = hasPostgresPasswordAuthFailed(exception)
        ? dbPasswordMismatchMessage
        : upstreamUnavailableMessage;
    } else {
      const raw = (exception as { message?: string })?.message?.trim();
      clientMessage = raw && raw.length > 0 ? raw : 'Internal server error';
    }

    const errObj = exception as { stack?: string; name?: string };
    const baseLog = {
      message: errObj?.name === 'AggregateError' ? 'AggregateError (часто ECONNREFUSED к Postgres/Redis)' : (exception as { message?: string })?.message,
      stack: errObj?.stack,
      url: request?.url,
      method: request?.method,
      ip: request?.ip,
      userAgent: request?.headers['user-agent'],
      status,
      timestamp: new Date().toISOString(),
    };
    if (hasPostgresPasswordAuthFailed(exception)) {
      this.logger.error({
        ...baseLog,
        hint: 'Пароль в томе Postgres и DATABASE_URL часто расходятся. Из корня репо: npm run ensure:database; Docker: контейнер escort-postgres (или POSTGRES_CONTAINER). Затем pm2 startOrReload ecosystem.config.cjs --only escort-api.',
      });
    } else {
      this.logger.error(baseLog);
    }

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      ...(isDev && errObj?.stack && { stack: errObj.stack }),
      ...(isDev && errObj?.name && { error: errObj.name }),
    });
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // ============================================
  // ENVIRONMENT VALIDATION
  // ============================================
  logger.log('Validating environment variables...');
  const envConfig = validateEnv(process.env);
  logger.log(`✓ Environment validated (NODE_ENV: ${envConfig.NODE_ENV})`);

  // ============================================
  // APP INITIALIZATION
  // ============================================
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    snapshot: process.env.NODE_ENV === 'development', // Debug mode
  });

  const configService = app.get(ConfigService);

  // ============================================
  // GLOBAL EXCEPTION FILTER
  // ============================================
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ============================================
  // SECURITY HEADERS (HELMET)
  // ============================================
  app.use(getHelmetConfig(configService));
  logger.log('✓ Helmet security headers enabled');

  // ============================================
  // CORS CONFIGURATION
  // ============================================
  const stripOriginSlash = (o: string) => o.replace(/\/+$/, '');

  const allowedOrigins = [
    envConfig.FRONTEND_URL,
    ...(envConfig.ALLOWED_ORIGINS || '').split(',').map((url) => url.trim()).filter(Boolean),
  ]
    .filter(Boolean)
    .map(stripOriginSlash);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const normalized = stripOriginSlash(origin);
      if (allowedOrigins.includes(normalized)) {
        callback(null, true);
      } else {
        logger.warn(
          `Blocked CORS request from: "${origin}" (normalized: "${normalized}") — allowed: ${allowedOrigins.join(', ')}`,
        );
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours
  });
  logger.log(`✓ CORS enabled for: ${allowedOrigins.join(', ')}`);

  // ============================================
  // API VERSIONING - DISABLED FOR AUTH COMPATIBILITY
  // ============================================
  /*
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });
  logger.log('✓ API versioning enabled (v1)');
  */
  logger.log('⚠️  API versioning disabled for auth compatibility');

  // ============================================
  // FAVICON
  // ============================================
  app.use('/favicon.ico', (req: any, res: any) => {
    res.status(204).send();
  });

  // ============================================
  // GLOBAL VALIDATION PIPE - ENABLED
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: envConfig.NODE_ENV === 'production',
      exceptionFactory: (errors) => {
        const formatted = errors.map((e) => ({
          field: e.property,
          errors: Object.values(e.constraints || {}),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: formatted,
        });
      },
    }),
  );
  logger.log('✓ Global validation pipe enabled');

  // ============================================
  // SWAGGER API DOCUMENTATION
  // ============================================
  const config = new DocumentBuilder()
    .setTitle('Lovnge Platform API')
    .setDescription('Premium escort platform API documentation')
    .setVersion('1.0')
    .addBearerAuth({
      description: 'JWT token obtained from /auth/login',
      name: 'Authorization',
      bearerFormat: 'Bearer',
      scheme: 'Bearer',
      type: 'http',
      in: 'Header',
    })
    .addTag('auth', 'Authentication endpoints')
    .addTag('profiles', 'Model profile management')
    .addTag('bookings', 'Booking management')
    .addTag('escrow', 'Escrow payments')
    .addTag('users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lovnge API Docs',
  });
  logger.log('✓ Swagger documentation enabled at /api/docs');

  // ============================================
  // GRACEFUL SHUTDOWN
  // ============================================
  const shutdownSignal = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    
    // Close server connections
    await app.close();
    
    // TODO: Close database connections
    // TODO: Flush audit logs
    // TODO: Clean up resources
    
    logger.log('Graceful shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdownSignal('SIGTERM'));
  process.on('SIGINT', () => shutdownSignal('SIGINT'));

  // ============================================
  // START SERVER
  // ============================================
  const port = configService.get('PORT', '3000');
  const host = configService.get('HOST', '0.0.0.0');
  
  await app.listen(port, host);

  logger.log(`🚀 API running on: http://${host}:${port}`);
  logger.log(`📚 Swagger docs: http://${host}:${port}/api/docs`);
  logger.log(`🔒 Health check: http://${host}:${port}/health`);
  logger.log(`⚡ Environment: ${envConfig.NODE_ENV}`);
  logger.log(`🛡️  Security: Helmet + CORS + Rate Limit + JWT Guards`);
}

bootstrap().catch((err) => {
  Logger.error('Failed to start application', err);
  if (hasPostgresPasswordAuthFailed(err)) {
    Logger.error(
      'Подсказка: npm run ensure:database из корня репозитория (нужен запущенный контейнер Postgres с именем из POSTGRES_CONTAINER или escort-postgres), затем перезапуск API через PM2 startOrReload.',
    );
  }
  process.exit(1);
});

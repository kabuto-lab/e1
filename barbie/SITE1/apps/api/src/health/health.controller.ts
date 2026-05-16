/**
 * HealthController — простой liveness/readiness endpoint.
 * Используется PM2 / Docker / nginx для health-проверок.
 *
 *   GET /health        → { ok: true, db: 'up'|'down', uptime, version }
 *   GET /health/ready  → 200 если все зависимости готовы, 503 иначе
 */
import { Controller, Get, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import type { Database } from '@barbie-site1/db';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startedAt = Date.now();

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  async liveness() {
    let dbOk = false;
    try {
      await this.db.execute(sql`select 1`);
      dbOk = true;
    } catch (err) {
      this.logger.warn(`DB health check failed: ${(err as Error).message}`);
    }
    return {
      ok: true,
      db: dbOk ? 'up' : 'down',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? '0.0.1',
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — fails with 503 if dependencies down' })
  async readiness() {
    try {
      await this.db.execute(sql`select 1`);
    } catch (err) {
      throw new HttpException(
        { ok: false, db: 'down', error: (err as Error).message },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { ok: true };
  }
}

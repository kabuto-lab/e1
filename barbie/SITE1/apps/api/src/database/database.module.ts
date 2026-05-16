/**
 * DatabaseModule — singleton Drizzle instance в DI.
 *
 * Использование:
 *   constructor(@Inject(DRIZZLE) private readonly db: Database) {}
 *
 * Для мультитенантных запросов всегда оборачивай в where(eq(table.tenantId, ctx.tenantId))
 * или используй withTenant() helper (TODO Stage 5). Прямой db.select() без tenant_id —
 * только из platform-admin контекста или background-задач.
 */
import { Global, Module, OnApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDb, closeDb, type Database } from '@barbie-site1/db';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database => {
        const url = config.get<string>('database.url');
        if (!url) {
          throw new Error('database.url is not configured');
        }
        return getDb(url);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Closing database connection pool…');
    await closeDb();
  }
}

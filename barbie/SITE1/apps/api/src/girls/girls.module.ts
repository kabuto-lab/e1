/**
 * GirlsModule — глобальный каталог моделей (Class-G).
 *
 * Регистрируется через `TenantsModule` (imports), чтобы не трогать spine
 * `app.module.ts`. DRIZZLE доступен глобально (DatabaseModule @Global).
 */
import { Module } from '@nestjs/common';
import { GirlsController } from './girls.controller';
import { PublicGirlsController } from './public-girls.controller';
import { GirlsService } from './girls.service';

@Module({
  controllers: [GirlsController, PublicGirlsController],
  providers: [GirlsService],
  exports: [GirlsService],
})
export class GirlsModule {}

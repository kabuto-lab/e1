import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TenantsController } from './tenants.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { TenantsService } from './tenants.service';
import { WpImportService } from './wp-import.service';
import { WpJobStore } from './wp-job-store';
import { WfyCitiesController } from './wfy-admin/wfy-cities.controller';
import { WfyCitiesService } from './wfy-admin/wfy-cities.service';
import { MediaModule } from '../media/media.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [
    MediaModule,
    ToolsModule,
    // JwtModule нужен для ручной верификации ?token= в SSE-stream'е WP-импорта.
    // useFactory повторяет регистрацию из AuthModule (single source of truth — env JWT_SECRET).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [TenantsController, PublicTenantsController, WfyCitiesController],
  providers: [TenantsService, WpImportService, WpJobStore, WfyCitiesService],
  exports: [TenantsService],
})
export class TenantsModule {}

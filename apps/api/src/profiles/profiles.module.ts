/**
 * Profiles Module
 * Manages model profiles and media files
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { MinioService } from './minio.service';

@Module({
  imports: [AuthGuardsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, MinioService],
  exports: [ProfilesService, MinioService],
})
export class ProfilesModule {}

/**
 * Media Module - загрузка фото/видео
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';

@Module({
  imports: [AuthGuardsModule],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}

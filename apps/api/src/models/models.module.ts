/**
 * Models Module - каталог анкет + HTTP-модерация (очередь под /models/moderation/*).
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ModelsService } from './models.service';
import { ModelsController } from './models.controller';
import { ModerationService } from '../moderation/moderation.service';
import { ModerationController } from '../moderation/moderation.controller';

@Module({
  imports: [AuthGuardsModule, ReviewsModule],
  providers: [ModelsService, ModerationService],
  controllers: [ModelsController, ModerationController],
  exports: [ModelsService],
})
export class ModelsModule {}

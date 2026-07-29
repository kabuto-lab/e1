/**
 * Models Module - каталог анкет + HTTP-модерация (очередь под /models/moderation/*).
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { ModelsService } from './models.service';
import { ModelsController } from './models.controller';
import { ModerationService } from '../moderation/moderation.service';
import { ModerationController } from '../moderation/moderation.controller';
import { TelegramRelayModule } from '../telegram-relay/telegram-relay.module';

@Module({
  imports: [AuthGuardsModule, ReviewsModule, MediaModule, UsersModule, TelegramRelayModule],
  providers: [ModelsService, ModerationService],
  controllers: [ModelsController, ModerationController],
  exports: [ModelsService],
})
export class ModelsModule {}

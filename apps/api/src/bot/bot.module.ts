import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { ModelWizardService } from './model-wizard.service';
import { UsersModule } from '../users/users.module';
import { ModelsModule } from '../models/models.module';
import { MediaModule } from '../media/media.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, ModelsModule, MediaModule, ProfilesModule, AuthModule],
  providers: [BotService, ModelWizardService],
})
export class BotModule {}

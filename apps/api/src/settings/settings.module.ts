import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuthGuardsModule, ProfilesModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuthGuardsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

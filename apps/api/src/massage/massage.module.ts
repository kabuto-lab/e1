import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MastersController } from './masters/masters.controller';
import { MastersService } from './masters/masters.service';
import { ProgramsController } from './programs/programs.controller';
import { ProgramsService } from './programs/programs.service';
import { MassageBookingsController } from './bookings/massage-bookings.controller';
import { MassageBookingsService } from './bookings/massage-bookings.service';
import { AccessRequestsController } from './access-requests/access-requests.controller';
import { AccessRequestsService } from './access-requests/access-requests.service';
import { MassageSettingsController } from './settings/massage-settings.controller';
import { MassageSettingsService } from './settings/massage-settings.service';
import { MassageNotifyService } from './notify.service';

/**
 * Массажный режим — полностью отдельная сущность (свои таблицы massage_*, свой API),
 * не зависит от models/bookings/settings эскорт-режима.
 */
@Module({
  imports: [AuthGuardsModule, ProfilesModule],
  controllers: [
    MastersController,
    ProgramsController,
    MassageBookingsController,
    AccessRequestsController,
    MassageSettingsController,
  ],
  providers: [
    MastersService,
    ProgramsService,
    MassageBookingsService,
    AccessRequestsService,
    MassageSettingsService,
    MassageNotifyService,
  ],
})
export class MassageModule {}

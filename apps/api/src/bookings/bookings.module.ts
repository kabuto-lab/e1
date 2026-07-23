/**
 * Bookings Module - система бронирований с state machine
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { ContactModule } from '../contact/contact.module';
import { ModelsModule } from '../models/models.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [AuthGuardsModule, ContactModule, ModelsModule, UsersModule, NotificationsModule],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}

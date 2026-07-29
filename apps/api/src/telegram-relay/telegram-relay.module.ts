import { Module } from '@nestjs/common';
import { TelegramRelayService } from './telegram-relay.service';
import { AntiLeakService } from '../communications/anti-leak.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [TelegramRelayService, AntiLeakService],
  exports: [TelegramRelayService],
})
export class TelegramRelayModule {}

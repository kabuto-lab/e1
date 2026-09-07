import { Module } from '@nestjs/common';
import { TelegramRelayService } from './telegram-relay.service';
import { TelegramRelayController } from './telegram-relay.controller';
import { AntiLeakService } from '../communications/anti-leak.service';
import { UsersModule } from '../users/users.module';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';

@Module({
  imports: [UsersModule, AuthGuardsModule],
  providers: [TelegramRelayService, AntiLeakService],
  controllers: [TelegramRelayController],
  exports: [TelegramRelayService],
})
export class TelegramRelayModule {}

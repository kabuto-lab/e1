/**
 * Blacklist Module - чёрный список
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { UsersModule } from '../users/users.module';
import { BlacklistService } from './blacklist.service';
import { BlacklistController } from './blacklist.controller';

@Module({
  imports: [AuthGuardsModule, UsersModule],
  providers: [BlacklistService],
  controllers: [BlacklistController],
  exports: [BlacklistService],
})
export class BlacklistModule {}

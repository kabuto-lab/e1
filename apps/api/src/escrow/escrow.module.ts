/**
 * Escrow Module - платежи и транзакции
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ModelsModule } from '../models/models.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EscrowService } from './escrow.service';
import { EscrowTonRepository } from './escrow-ton.repository';
import { TonEscrowService } from './ton-escrow.service';
import { TbankEscrowService } from './tbank-escrow.service';
import { TbankClientService } from './tbank/tbank-client.service';
import { TonEscrowDepositGuard } from './guards/ton-escrow-deposit.guard';
import { TonEscrowIndexerService } from './indexer/ton-escrow-indexer.service';
import { TonHotWalletService } from './ton/ton-hot-wallet.service';
import { TonExchangeRateService } from './ton/ton-exchange-rate.service';
import { EscrowController } from './escrow.controller';

@Module({
  imports: [AuthGuardsModule, BookingsModule, ModelsModule, UsersModule, NotificationsModule],
  providers: [
    EscrowService,
    EscrowTonRepository,
    TonHotWalletService,
    TonExchangeRateService,
    TonEscrowService,
    TonEscrowDepositGuard,
    TonEscrowIndexerService,
    TbankClientService,
    TbankEscrowService,
  ],
  controllers: [EscrowController],
  exports: [
    EscrowService,
    EscrowTonRepository,
    TonEscrowService,
    TbankEscrowService,
    TonHotWalletService,
    TonExchangeRateService,
  ],
})
export class EscrowModule {}

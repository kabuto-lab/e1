/**
 * Escrow Module - платежи и транзакции
 */

import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { BookingsModule } from '../bookings/bookings.module';
import { EscrowService } from './escrow.service';
import { EscrowTonRepository } from './escrow-ton.repository';
import { TonEscrowService } from './ton-escrow.service';
import { TonEscrowDepositGuard } from './guards/ton-escrow-deposit.guard';
import { TonEscrowIndexerService } from './indexer/ton-escrow-indexer.service';
import { TonHotWalletService } from './ton/ton-hot-wallet.service';
import { EscrowController } from './escrow.controller';

@Module({
  imports: [AuthGuardsModule, BookingsModule],
  providers: [
    EscrowService,
    EscrowTonRepository,
    TonHotWalletService,
    TonEscrowService,
    TonEscrowDepositGuard,
    TonEscrowIndexerService,
  ],
  controllers: [EscrowController],
  exports: [EscrowService, EscrowTonRepository, TonEscrowService],
})
export class EscrowModule {}

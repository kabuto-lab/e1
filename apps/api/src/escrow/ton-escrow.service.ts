/**
 * Создание TON USDT intent: валидация брони, конфиг сети, запись в БД + аудит.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { escrowTransactions, type EscrowTonNetwork, type EscrowTransaction } from '@escort/db';
import { BookingsService } from '../bookings/bookings.service';
import { UsersService } from '../users/users.service';
import { TelegramNotifyService } from '../notifications/telegram-notify.service';
import { EscrowTonRepository } from './escrow-ton.repository';
import { TonHotWalletService } from './ton/ton-hot-wallet.service';
import { CryptoAmount } from './domain/value-objects/crypto-amount.vo';
import { EscrowMemo } from './domain/value-objects/escrow-memo.vo';
import { TonAddress } from './domain/value-objects/ton-address.vo';
import type { BroadcastTonJettonDto } from './dto/broadcast-ton-jetton.dto';
import type { ConfirmTonRefundDto } from './dto/confirm-ton-refund.dto';
import type { ConfirmTonReleaseDto } from './dto/confirm-ton-release.dto';
import type { CreateTonIntentDto } from './dto/create-ton-intent.dto';
import type { RecordTonDepositDto } from './dto/record-ton-deposit.dto';

const ALLOWED_BOOKING_STATUS_FOR_INTENT = new Set(['draft', 'pending_payment']);

const RELEASABLE_ESCROW_STATUS = new Set<EscrowTransaction['status']>([
  'funded',
  'hold_period',
  'disputed_hold',
]);

const REFUNDABLE_ESCROW_STATUS = new Set<EscrowTransaction['status']>([
  'funded',
  'hold_period',
  'disputed_hold',
]);

function clampChainHash(raw: string): string {
  const t = raw.trim();
  if (!t) {
    throw new BadRequestException('Transaction hash is required');
  }
  return t.length > 128 ? t.slice(0, 128) : t;
}

function parseAtomicString(raw: string): bigint {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new BadRequestException('Invalid expectedAmountAtomic');
  }
  return BigInt(trimmed);
}

function amountHeldFromCrypto(amount: CryptoAmount): string {
  const hr = amount.toHumanReadable();
  const n = Number(hr);
  if (!Number.isFinite(n)) {
    throw new BadRequestException('Amount overflow for display field');
  }
  return n.toFixed(2);
}

/** Ответ API: bigint из Drizzle → строки (JSON без BigInt). */
export function serializeEscrowTransaction(row: EscrowTransaction): Record<string, unknown> {
  return {
    ...row,
    expectedAmountAtomic:
      row.expectedAmountAtomic != null ? row.expectedAmountAtomic.toString() : null,
    receivedAmountAtomic:
      row.receivedAmountAtomic != null ? row.receivedAmountAtomic.toString() : null,
  };
}

/**
 * ЛК / API: только полезные поля ton_usdt (без state_history и прочих внутренних JSON).
 * bigint → string; плюс human-readable суммы.
 */
export function tonEscrowToClientView(row: EscrowTransaction): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: row.id,
    bookingId: row.bookingId,
    paymentProvider: row.paymentProvider,
    status: row.status,
    amountHeld: row.amountHeld,
    currency: row.currency,
    expectedAmountAtomic:
      row.expectedAmountAtomic != null ? row.expectedAmountAtomic.toString() : null,
    receivedAmountAtomic:
      row.receivedAmountAtomic != null ? row.receivedAmountAtomic.toString() : null,
    assetDecimals: row.assetDecimals,
    network: row.network,
    jettonMasterAddress: row.jettonMasterAddress,
    treasuryAddress: row.treasuryAddress,
    expectedMemo: row.expectedMemo,
    fundedTxHash: row.fundedTxHash,
    releaseTxHash: row.releaseTxHash,
    refundTxHash: row.refundTxHash,
    confirmations: row.confirmations,
    fundedAt: row.fundedAt,
    holdUntil: row.holdUntil,
    releasedAt: row.releasedAt,
    refundedAt: row.refundedAt,
    releaseTrigger: row.releaseTrigger,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  const decimals = row.assetDecimals;
  if (decimals != null && row.expectedAmountAtomic != null) {
    const exp = CryptoAmount.fromAtomic(row.expectedAmountAtomic, decimals);
    out.expectedAmountHuman = exp.toHumanReadable();
  }
  if (decimals != null && row.receivedAmountAtomic != null) {
    const rec = CryptoAmount.fromAtomic(row.receivedAmountAtomic, decimals);
    out.receivedAmountHuman = rec.toHumanReadable();
  }
  return out;
}

@Injectable()
export class TonEscrowService {
  private readonly logger = new Logger(TonEscrowService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly bookings: BookingsService,
    private readonly tonRepo: EscrowTonRepository,
    private readonly hotWallet: TonHotWalletService,
    private readonly users: UsersService,
    private readonly tgNotify: TelegramNotifyService,
  ) {}

  private async notifyBookingParties(
    bookingId: string,
    event: import('../notifications/telegram-notify.service').TgNotifyEvent,
    amountHuman?: string | null,
  ): Promise<void> {
    try {
      const booking = await this.bookings.findById(bookingId);
      if (!booking) return;
      const [client, manager] = await Promise.all([
        booking.clientId ? this.users.findById(booking.clientId) : null,
        booking.managerId ? this.users.findById(booking.managerId) : null,
      ]);
      await this.tgNotify.notifyMany(
        [client?.telegramId, manager?.telegramId],
        { event, bookingId, amountHuman },
      );
    } catch (e) {
      this.logger.warn(`notifyBookingParties failed: ${(e as Error).message}`);
    }
  }

  /**
   * Просмотр TON USDT эскроу по booking: клиент брони или admin/manager.
   */
  async getTonEscrowByBookingForViewer(
    viewerUserId: string,
    viewerRole: string,
    bookingId: string,
  ): Promise<Record<string, unknown>> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const isStaff = viewerRole === 'admin' || viewerRole === 'manager';
    if (!isStaff && booking.clientId !== viewerUserId) {
      throw new ForbiddenException('You cannot view escrow for this booking');
    }

    const escrow = await this.tonRepo.findByBookingId(bookingId);
    if (!escrow || escrow.paymentProvider !== 'ton_usdt') {
      throw new NotFoundException('No TON USDT escrow for this booking');
    }

    return tonEscrowToClientView(escrow);
  }

  async createIntent(actorUserId: string, dto: CreateTonIntentDto): Promise<Record<string, unknown>> {
    const network = this.config.get<EscrowTonNetwork | undefined>('TON_NETWORK');
    const jettonRaw = this.config.get<string | undefined>('TON_USDT_JETTON_MASTER');
    const treasuryRaw = this.config.get<string | undefined>('TON_TREASURY_ADDRESS');

    if (!network || !jettonRaw || !treasuryRaw) {
      throw new ServiceUnavailableException(
        'TON escrow is not configured (set TON_NETWORK, TON_USDT_JETTON_MASTER, TON_TREASURY_ADDRESS)',
      );
    }

    const jetton = TonAddress.parse(jettonRaw);
    const treasury = TonAddress.parse(treasuryRaw);

    const booking = await this.bookings.findById(dto.bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.clientId !== actorUserId) {
      throw new ForbiddenException('Only the booking client can create a TON escrow intent');
    }

    const status = booking.status ?? 'draft';
    if (!ALLOWED_BOOKING_STATUS_FOR_INTENT.has(status)) {
      throw new BadRequestException(
        `Booking status must be draft or pending_payment to create TON intent (current: ${status})`,
      );
    }

    const existing = await this.tonRepo.findByBookingId(dto.bookingId);
    if (existing) {
      throw new ConflictException('Escrow already exists for this booking');
    }

    const decimals = dto.assetDecimals ?? 6;
    const atomic = parseAtomicString(dto.expectedAmountAtomic);
    if (atomic === 0n) {
      throw new BadRequestException('expectedAmountAtomic must be greater than zero');
    }

    const cryptoAmount = CryptoAmount.fromAtomic(atomic, decimals);
    const escrowId = randomUUID();
    const memo = EscrowMemo.fromEscrowUuid(escrowId);

    const row = await this.tonRepo.createIntentWithAudit({
      escrowRow: {
        id: escrowId,
        bookingId: dto.bookingId,
        paymentProvider: 'ton_usdt',
        amountHeld: amountHeldFromCrypto(cryptoAmount),
        currency: 'USD',
        expectedAmountAtomic: atomic,
        assetDecimals: decimals,
        network,
        jettonMasterAddress: jetton.toString(),
        treasuryAddress: treasury.toString(),
        expectedMemo: memo.toString(),
        status: 'pending_funding',
        confirmations: 0,
      },
      actorUserId,
      auditPayload: {
        bookingId: dto.bookingId,
        expectedAmountAtomic: atomic.toString(),
        assetDecimals: decimals,
        network,
      },
    });

    return tonEscrowToClientView(row);
  }

  /**
   * Учёт входящего jetton-перевода (индексер / воркер). Идемпотентно по tx_hash.
   */
  async recordDeposit(dto: RecordTonDepositDto): Promise<Record<string, unknown>> {
    const memoVo = EscrowMemo.parse(dto.memo);

    // Anti-replay: reject already-seen txHash before any state machine work
    const existing = await this.tonRepo.findDepositByTxHash(dto.txHash);
    if (existing) {
      this.logger.debug(`recordDeposit: txHash already processed (idempotent) tx=${dto.txHash}`);
      const escrow = await this.tonRepo.findById(existing.escrowTransactionId);
      if (escrow) {
        return { idempotent: true, fullyFunded: escrow.status === 'funded', escrow: tonEscrowToClientView(escrow) };
      }
    }

    const outcome = await this.tonRepo.withTransaction(async (tx) => {
      const escrow = await this.tonRepo.findByExpectedMemoTx(tx, memoVo.toString());
      if (!escrow) {
        throw new NotFoundException('No escrow matches this memo');
      }

      if (escrow.paymentProvider !== 'ton_usdt') {
        throw new BadRequestException('Escrow is not a TON USDT payment');
      }

      if (escrow.expectedAmountAtomic == null || escrow.assetDecimals == null) {
        throw new BadRequestException('Escrow has no expected atomic amount');
      }

      if (dto.network != null && escrow.network != null && dto.network !== escrow.network) {
        throw new BadRequestException('Network mismatch');
      }

      const treasuryEscrow = TonAddress.parse(escrow.treasuryAddress ?? '');
      const jettonEscrow = TonAddress.parse(escrow.jettonMasterAddress ?? '');
      const treasuryIn = TonAddress.parse(dto.treasuryAddressRaw);
      const jettonIn = TonAddress.parse(dto.jettonMasterRaw);
      if (treasuryEscrow.toString() !== treasuryIn.toString() || jettonEscrow.toString() !== jettonIn.toString()) {
        throw new BadRequestException('Treasury or jetton master does not match escrow');
      }

      const amountIn = parseAtomicString(dto.amountAtomic);
      if (amountIn === 0n) {
        throw new BadRequestException('amountAtomic must be positive');
      }

      const decimals = escrow.assetDecimals;

      if (escrow.status === 'funded') {
        const existingDep = await this.tonRepo.findDepositByTxHashTx(tx, dto.txHash);
        if (existingDep) {
          if (existingDep.escrowTransactionId !== escrow.id) {
            throw new BadRequestException('tx_hash is linked to another escrow');
          }
          return {
            idempotent: true,
            fundedJustNow: false,
            row: escrow,
          };
        }
        throw new ConflictException('Escrow is already funded');
      }

      if (escrow.status !== 'pending_funding') {
        throw new ConflictException(`Escrow status ${escrow.status} does not accept deposits`);
      }

      const logicalTime = dto.logicalTime != null ? BigInt(dto.logicalTime) : undefined;
      const confirmations = dto.confirmationCount ?? 0;

      const insertResult = await this.tonRepo.insertDepositIdempotentTx(tx, {
        escrowTransactionId: escrow.id,
        txHash: dto.txHash.trim(),
        logicalTime,
        fromAddressRaw: dto.fromAddressRaw.trim(),
        treasuryAddressRaw: treasuryIn.toString(),
        jettonMasterRaw: jettonIn.toString(),
        amountAtomic: amountIn,
        memoMatched: memoVo.toString(),
        confirmationCount: confirmations,
        indexerSource: dto.indexerSource?.trim(),
        rawPayload: dto.rawPayload,
      });

      if (!insertResult.inserted) {
        const latest = await this.tonRepo.findByIdTx(tx, escrow.id);
        return { idempotent: true, fundedJustNow: false, row: latest ?? escrow };
      }

      const depositCrypto = CryptoAmount.fromAtomic(amountIn, decimals);
      const prevReceived = escrow.receivedAmountAtomic ?? 0n;
      const prevCrypto = CryptoAmount.fromAtomic(prevReceived, decimals);
      const newCrypto = prevCrypto.add(depositCrypto);
      const newReceived = newCrypto.toAtomic();
      const expectedCrypto = CryptoAmount.fromAtomic(escrow.expectedAmountAtomic, decimals);
      const fullyFunded = newCrypto.gte(expectedCrypto);
      const maxConf = Math.max(escrow.confirmations ?? 0, confirmations);

      let fundedJustNow = false;
      let nextStatus: EscrowTransaction['status'] = escrow.status;
      let fundedAt = escrow.fundedAt;
      let fundedTxHash = escrow.fundedTxHash;

      if (fullyFunded) {
        nextStatus = 'funded';
        fundedAt = new Date();
        fundedTxHash = dto.txHash.trim();
        fundedJustNow = true;
      }

      const [updated] = await tx
        .update(escrowTransactions)
        .set({
          receivedAmountAtomic: newReceived,
          status: nextStatus,
          fundedAt: fundedAt ?? undefined,
          fundedTxHash: fundedTxHash ?? undefined,
          confirmations: maxConf,
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, escrow.id))
        .returning();

      const row = updated ?? escrow;

      await this.tonRepo.appendAudit(tx, {
        escrowTransactionId: escrow.id,
        eventType: fullyFunded ? 'ton_deposit_funded' : 'ton_deposit_partial',
        actorType: 'system',
        payload: {
          txHash: dto.txHash,
          amountAtomic: amountIn.toString(),
          newReceived: newReceived.toString(),
          expectedAtomic: escrow.expectedAmountAtomic.toString(),
        },
      });

      if (fundedJustNow) {
        await this.tonRepo.appendAudit(tx, {
          escrowTransactionId: escrow.id,
          eventType: 'ton_escrow_fully_funded',
          actorType: 'system',
          payload: { bookingId: escrow.bookingId },
        });
      }

      return { idempotent: false, fundedJustNow, row };
    });

    if (outcome.fundedJustNow) {
      await this.advanceBookingAfterTonFunding(outcome.row.bookingId);
      void this.notifyBookingParties(
        outcome.row.bookingId,
        'escrow_funded',
        outcome.row.receivedAmountAtomic != null
          ? CryptoAmount.fromAtomic(outcome.row.receivedAmountAtomic, outcome.row.assetDecimals ?? 6).toHumanReadable()
          : null,
      );
    }

    return {
      idempotent: outcome.idempotent,
      fullyFunded: outcome.row.status === 'funded',
      escrow: tonEscrowToClientView(outcome.row),
    };
  }

  private async advanceBookingAfterTonFunding(bookingId: string): Promise<void> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      return;
    }
    const status = booking.status ?? 'draft';

    if (status === 'draft') {
      try {
        await this.bookings.transitionState(bookingId, 'pending_payment', 'system');
      } catch (e) {
        if (!(e instanceof ConflictException)) {
          this.logger.error(
            `Booking ${bookingId}: draft→pending_payment failed: ${(e as Error).message}`,
          );
        }
      }
    }

    const again = await this.bookings.findById(bookingId);
    const s2 = again?.status ?? 'draft';
    if (s2 !== 'pending_payment') {
      return;
    }

    try {
      await this.bookings.transitionState(bookingId, 'escrow_funded', 'system');
    } catch (e) {
      if (!(e instanceof ConflictException)) {
        this.logger.error(
          `Booking ${bookingId}: pending_payment→escrow_funded failed: ${(e as Error).message}`,
        );
      }
    }
  }

  /**
   * Зафиксировать выплату модели после отправки jetton с treasury (хеш on-chain).
   * Не подписывает транзакцию — только доменное состояние + аудит.
   */
  async confirmRelease(
    actorUserId: string,
    escrowId: string,
    dto: ConfirmTonReleaseDto,
  ): Promise<Record<string, unknown>> {
    const hash = clampChainHash(dto.releaseTxHash);
    const recipient = TonAddress.parse(dto.recipientAddress);

    const row = await this.tonRepo.withTransaction(async (tx) => {
      const escrow = await this.tonRepo.findByIdTx(tx, escrowId);
      if (!escrow) {
        throw new NotFoundException('Escrow not found');
      }
      if (escrow.paymentProvider !== 'ton_usdt') {
        throw new BadRequestException('Not a TON USDT escrow');
      }

      if (escrow.status === 'released') {
        if (escrow.releaseTxHash === hash) {
          return escrow;
        }
        throw new ConflictException('Escrow already released with a different transaction hash');
      }

      if (!RELEASABLE_ESCROW_STATUS.has(escrow.status ?? 'pending_funding')) {
        throw new ConflictException(`Cannot release escrow in status ${escrow.status}`);
      }

      const [updated] = await tx
        .update(escrowTransactions)
        .set({
          status: 'released',
          releaseTxHash: hash,
          releasedAt: new Date(),
          releaseTrigger: 'manual_confirm',
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, escrowId))
        .returning();

      const out = updated ?? escrow;

      await this.tonRepo.appendAudit(tx, {
        escrowTransactionId: escrowId,
        eventType: 'ton_release_confirmed',
        actorType: 'user',
        actorUserId: actorUserId,
        payload: {
          releaseTxHash: hash,
          recipientAddress: recipient.toString(),
          note: dto.note,
        },
      });

      return out;
    });

    const booking = await this.bookings.findById(row.bookingId);
    if (booking?.status === 'escrow_funded') {
      try {
        await this.bookings.transitionState(row.bookingId, 'confirmed', actorUserId);
      } catch (e) {
        if (!(e instanceof ConflictException)) {
          this.logger.warn(
            `Booking ${row.bookingId}: escrow_funded→confirmed after TON release failed: ${(e as Error).message}`,
          );
        }
      }
    }

    void this.notifyBookingParties(row.bookingId, 'escrow_released');

    return tonEscrowToClientView(row);
  }

  /**
   * Зафиксировать возврат клиенту после on-chain перевода.
   */
  async confirmRefund(
    actorUserId: string,
    escrowId: string,
    dto: ConfirmTonRefundDto,
  ): Promise<Record<string, unknown>> {
    const hash = clampChainHash(dto.refundTxHash);
    const recipient = TonAddress.parse(dto.recipientAddress);

    const row = await this.tonRepo.withTransaction(async (tx) => {
      const escrow = await this.tonRepo.findByIdTx(tx, escrowId);
      if (!escrow) {
        throw new NotFoundException('Escrow not found');
      }
      if (escrow.paymentProvider !== 'ton_usdt') {
        throw new BadRequestException('Not a TON USDT escrow');
      }

      if (escrow.status === 'refunded') {
        if (escrow.refundTxHash === hash) {
          return escrow;
        }
        throw new ConflictException('Escrow already refunded with a different transaction hash');
      }

      if (!REFUNDABLE_ESCROW_STATUS.has(escrow.status ?? 'pending_funding')) {
        throw new ConflictException(`Cannot refund escrow in status ${escrow.status}`);
      }

      const [updated] = await tx
        .update(escrowTransactions)
        .set({
          status: 'refunded',
          refundTxHash: hash,
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, escrowId))
        .returning();

      const out = updated ?? escrow;

      await this.tonRepo.appendAudit(tx, {
        escrowTransactionId: escrowId,
        eventType: 'ton_refund_confirmed',
        actorType: 'user',
        actorUserId: actorUserId,
        payload: {
          refundTxHash: hash,
          recipientAddress: recipient.toString(),
        },
      });

      return out;
    });

    const booking = await this.bookings.findById(row.bookingId);
    const bs = booking?.status;
    if (bs && bs !== 'cancelled' && bs !== 'refunded' && bs !== 'completed') {
      try {
        await this.bookings.transitionState(
          row.bookingId,
          'cancelled',
          actorUserId,
          dto.cancellationReason ?? 'TON USDT refund',
        );
      } catch (e) {
        if (!(e instanceof ConflictException)) {
          this.logger.warn(
            `Booking ${row.bookingId}: cancel after TON refund failed: ${(e as Error).message}`,
          );
        }
      }
    }

    void this.notifyBookingParties(row.bookingId, 'escrow_refunded');

    return tonEscrowToClientView(row);
  }

  /**
   * Отправить USDT jetton на адрес модели (hot wallet), затем зафиксировать release в БД.
   */
  async broadcastRelease(
    actorUserId: string,
    escrowId: string,
    dto: BroadcastTonJettonDto,
  ): Promise<Record<string, unknown>> {
    const escrow = await this.tonRepo.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    if (escrow.paymentProvider !== 'ton_usdt') {
      throw new BadRequestException('Not a TON USDT escrow');
    }
    if (!RELEASABLE_ESCROW_STATUS.has(escrow.status ?? 'pending_funding')) {
      throw new ConflictException(`Cannot release escrow in status ${escrow.status}`);
    }
    if (escrow.status === 'released') {
      throw new ConflictException('Escrow already released');
    }

    const amount = escrow.receivedAmountAtomic ?? escrow.expectedAmountAtomic;
    if (amount == null || amount <= 0n) {
      throw new BadRequestException('No jetton amount to release');
    }

    const tag = escrowId.replace(/-/g, '').slice(0, 16);
    const txHash = await this.hotWallet.transferJettonToOwner({
      recipientOwnerAddress: dto.recipientAddress,
      jettonAmountAtomic: amount,
      forwardComment: `rel:${tag}`,
    });

    return this.confirmRelease(actorUserId, escrowId, {
      releaseTxHash: txHash,
      recipientAddress: dto.recipientAddress,
      note: dto.note ?? 'hot_wallet_broadcast',
    });
  }

  /**
   * Отправить USDT jetton клиенту, затем зафиксировать refund в БД.
   */
  async broadcastRefund(
    actorUserId: string,
    escrowId: string,
    dto: BroadcastTonJettonDto,
  ): Promise<Record<string, unknown>> {
    const escrow = await this.tonRepo.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    if (escrow.paymentProvider !== 'ton_usdt') {
      throw new BadRequestException('Not a TON USDT escrow');
    }
    if (!REFUNDABLE_ESCROW_STATUS.has(escrow.status ?? 'pending_funding')) {
      throw new ConflictException(`Cannot refund escrow in status ${escrow.status}`);
    }
    if (escrow.status === 'refunded') {
      throw new ConflictException('Escrow already refunded');
    }

    const amount = escrow.receivedAmountAtomic ?? escrow.expectedAmountAtomic;
    if (amount == null || amount <= 0n) {
      throw new BadRequestException('No jetton amount to refund');
    }

    const tag = escrowId.replace(/-/g, '').slice(0, 16);
    const txHash = await this.hotWallet.transferJettonToOwner({
      recipientOwnerAddress: dto.recipientAddress,
      jettonAmountAtomic: amount,
      forwardComment: `ref:${tag}`,
    });

    return this.confirmRefund(actorUserId, escrowId, {
      refundTxHash: txHash,
      recipientAddress: dto.recipientAddress,
      cancellationReason: dto.cancellationReason ?? 'TON USDT refund (broadcast)',
    });
  }
}

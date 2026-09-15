/**
 * PayoutsService — баланс заработанного (модель/менеджер) и единая очередь заявок на вывод,
 * банком (реквизиты, перевод происходит вне платформы вручную) или в TON-кошелёк (адрес,
 * система сама отправляет USDT с hot wallet при переходе заявки в paid — см. transitionRequest).
 *
 * TON-брони НЕ выплачиваются исполнителю/менеджеру напрямую при завершении (см.
 * TonEscrowService.settleWithoutPayout) — сумма (в рублёвом эквиваленте, bookings.modelPayout/
 * managerPayout) остаётся на hot wallet и просто попадает в общий баланс, наравне с RUB-бронями.
 * Исключение — эскроу, завершённые через confirmRelease/broadcastRelease (releaseTrigger !==
 * 'pooled_no_payout'): там деньги уже ушли адресату напрямую, такие брони не считаются в
 * "заработано" второй раз (см. фильтр в getBalance).
 */

import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  bookings,
  escrowTransactions,
  modelProfiles,
  payoutRequests,
  type PayoutRequest,
  type PayoutRequestMethod,
  type PayoutRequestStatus,
} from '@escort/db';
import { EmployeesService } from '../employees/employees.service';
import { TonHotWalletService } from '../escrow/ton/ton-hot-wallet.service';
import { TonExchangeRateService } from '../escrow/ton/ton-exchange-rate.service';
import { TonAddress } from '../escrow/domain/value-objects/ton-address.vo';
import { CryptoAmount } from '../escrow/domain/value-objects/crypto-amount.vo';

export interface PayoutBalance {
  earned: string;
  paid: string;
  pending: string;
  available: string;
}

const REQUESTER_ROLES = new Set(['model', 'manager']);
const STAFF_ROLES = new Set(['admin', 'moderator']);
/** USDT jetton на TON — всегда 6 decimals (см. TonEscrowService). */
const USDT_DECIMALS = 6;

/** bigint (usdtAmountAtomic) не сериализуется в JSON напрямую — приводим к строке, как в TonEscrowService. */
function serializePayoutRequest(row: PayoutRequest): Record<string, unknown> {
  return {
    ...row,
    usdtAmountAtomic: row.usdtAmountAtomic != null ? row.usdtAmountAtomic.toString() : null,
  };
}

/** true, если бронь уже выплачена напрямую на адрес (confirmRelease/broadcastRelease) — не
 *  считать её ещё раз в общем балансе. */
function isDirectlySettled(escrow: { paymentProvider: string | null; releaseTrigger: string | null } | null): boolean {
  return !!escrow && escrow.paymentProvider === 'ton_usdt' && escrow.releaseTrigger !== 'pooled_no_payout';
}

const TRANSITIONS: Record<PayoutRequestStatus, PayoutRequestStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: [],
};

function toCents(amount: string | null | undefined): number {
  return Math.round(parseFloat(amount || '0') * 100);
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

@Injectable()
export class PayoutsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly employeesService: EmployeesService,
    private readonly hotWallet: TonHotWalletService,
    private readonly exchangeRate: TonExchangeRateService,
  ) {}

  async getBalance(userId: string, role: string): Promise<PayoutBalance> {
    if (!REQUESTER_ROLES.has(role)) {
      throw new ForbiddenException('Only models and managers have a payout balance');
    }

    let earnedCents = 0;

    if (role === 'model') {
      const [profile] = await this.db
        .select({ id: modelProfiles.id })
        .from(modelProfiles)
        .where(eq(modelProfiles.userId, userId))
        .limit(1);

      if (profile) {
        const rows = await this.db
          .select({
            modelPayout: bookings.modelPayout,
            paymentProvider: escrowTransactions.paymentProvider,
            releaseTrigger: escrowTransactions.releaseTrigger,
          })
          .from(bookings)
          .leftJoin(escrowTransactions, eq(escrowTransactions.bookingId, bookings.id))
          .where(and(eq(bookings.modelId, profile.id), eq(bookings.status, 'completed')));
        earnedCents = rows
          .filter((r: any) => !isDirectlySettled(r))
          .reduce((sum: number, r: any) => sum + toCents(r.modelPayout), 0);
      }
    } else {
      const profiles = await this.db
        .select({ id: modelProfiles.id })
        .from(modelProfiles)
        .where(eq(modelProfiles.managerId, userId));

      const profileIds = profiles.map((p: any) => p.id);
      if (profileIds.length > 0) {
        const rows = await this.db
          .select({
            managerPayout: bookings.managerPayout,
            paymentProvider: escrowTransactions.paymentProvider,
            releaseTrigger: escrowTransactions.releaseTrigger,
          })
          .from(bookings)
          .leftJoin(escrowTransactions, eq(escrowTransactions.bookingId, bookings.id))
          .where(and(inArray(bookings.modelId, profileIds), eq(bookings.status, 'completed')));
        earnedCents = rows
          .filter((r: any) => !isDirectlySettled(r))
          .reduce((sum: number, r: any) => sum + toCents(r.managerPayout), 0);
      }
    }

    const requests = await this.db
      .select({ amount: payoutRequests.amount, status: payoutRequests.status })
      .from(payoutRequests)
      .where(eq(payoutRequests.userId, userId));

    const paidCents = requests
      .filter((r: any) => r.status === 'paid')
      .reduce((sum: number, r: any) => sum + toCents(r.amount), 0);
    const pendingCents = requests
      .filter((r: any) => r.status === 'pending' || r.status === 'approved')
      .reduce((sum: number, r: any) => sum + toCents(r.amount), 0);

    const availableCents = Math.max(0, earnedCents - paidCents - pendingCents);

    return {
      earned: fromCents(earnedCents),
      paid: fromCents(paidCents),
      pending: fromCents(pendingCents),
      available: fromCents(availableCents),
    };
  }

  async createRequest(
    userId: string,
    role: string,
    amount: string,
    method: PayoutRequestMethod,
    requisites?: string,
    tonWalletAddress?: string,
  ): Promise<Record<string, unknown>> {
    if (!REQUESTER_ROLES.has(role)) {
      throw new ForbiddenException('Only models and managers can request a payout');
    }

    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const balance = await this.getBalance(userId, role);
    if (amountCents > toCents(balance.available)) {
      throw new BadRequestException(
        `Requested amount (${fromCents(amountCents)}) exceeds available balance (${balance.available})`,
      );
    }

    let normalizedTonAddress: string | null = null;
    if (method === 'ton_wallet') {
      if (!tonWalletAddress) {
        throw new BadRequestException('tonWalletAddress is required when method is ton_wallet');
      }
      normalizedTonAddress = TonAddress.parse(tonWalletAddress).toString();
    } else if (!requisites) {
      throw new BadRequestException('requisites is required when method is bank');
    }

    const inserted = await this.db
      .insert(payoutRequests)
      .values({
        userId,
        amount: fromCents(amountCents),
        status: 'pending',
        method,
        requisites: method === 'bank' ? requisites : null,
        tonWalletAddress: normalizedTonAddress,
      })
      .returning();

    return serializePayoutRequest(inserted[0]);
  }

  /** userId аккаунтов всех моделей в пуле менеджера — для scope-проверок по выплатам. */
  private async getManagedModelUserIds(managerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: modelProfiles.userId })
      .from(modelProfiles)
      .where(eq(modelProfiles.managerId, managerId));
    return rows.map((r: { userId: string | null }) => r.userId).filter((id: string | null): id is string => !!id);
  }

  async listRequests(
    actorUserId: string,
    actorRole: string,
    status?: PayoutRequestStatus,
  ): Promise<Record<string, unknown>[]> {
    const conditions: any[] = [];
    if (STAFF_ROLES.has(actorRole)) {
      // видно всё
    } else if (actorRole === 'manager') {
      // свои заявки (на комиссию) + заявки моделей своего пула
      const modelUserIds = await this.getManagedModelUserIds(actorUserId);
      conditions.push(inArray(payoutRequests.userId, [actorUserId, ...modelUserIds]));
    } else if (actorRole === 'employee') {
      const access = await this.employeesService.getAccess(actorUserId);
      if (!access?.canManagePayouts) {
        throw new ForbiddenException('Not allowed to view payout requests');
      }
      const modelUserIds = await this.getManagedModelUserIds(access.managerId);
      conditions.push(inArray(payoutRequests.userId, modelUserIds));
    } else if (REQUESTER_ROLES.has(actorRole)) {
      conditions.push(eq(payoutRequests.userId, actorUserId));
    } else {
      throw new ForbiddenException('Not allowed to view payout requests');
    }
    if (status) {
      conditions.push(eq(payoutRequests.status, status));
    }

    const rows: PayoutRequest[] = await this.db
      .select()
      .from(payoutRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(payoutRequests.requestedAt);
    return rows.map(serializePayoutRequest);
  }

  async transitionRequest(
    actorUserId: string,
    actorRole: string,
    requestId: string,
    newStatus: PayoutRequestStatus,
    note?: string,
  ): Promise<Record<string, unknown>> {
    const [current] = await this.db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, requestId))
      .limit(1);

    if (!current) {
      throw new NotFoundException('Payout request not found');
    }

    if (actorRole === 'manager') {
      // Менеджер одобряет только заявки СВОИХ моделей — не свои собственные (это уже
      // конфликт интересов, самоодобрение остаётся за admin/moderator) и не чужие.
      const modelUserIds = await this.getManagedModelUserIds(actorUserId);
      if (!modelUserIds.includes(current.userId)) {
        throw new ForbiddenException('Not your model\'s payout request');
      }
    } else if (actorRole === 'employee') {
      // Сотрудник — только с canManagePayouts, и только заявки моделей своего менеджера
      // (никогда заявки самого менеджера на комиссию — конфликт интересов).
      const access = await this.employeesService.getAccess(actorUserId);
      if (!access?.canManagePayouts) {
        throw new ForbiddenException('Not allowed to transition payout requests');
      }
      const modelUserIds = await this.getManagedModelUserIds(access.managerId);
      if (!modelUserIds.includes(current.userId)) {
        throw new ForbiddenException('Not your team\'s model payout request');
      }
    } else if (!STAFF_ROLES.has(actorRole)) {
      throw new ForbiddenException('Not allowed to transition payout requests');
    }

    const allowed = TRANSITIONS[current.status as PayoutRequestStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${current.status} to ${newStatus}`);
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      note: note ?? current.note,
      processedByUserId: actorUserId,
      processedAt: new Date(),
      updatedAt: new Date(),
    };

    // Курс фиксируется при одобрении — чтобы сумма в USDT не "плыла" между approve и
    // фактической отправкой (см. TonExchangeRateService).
    if (newStatus === 'approved' && current.method === 'ton_wallet') {
      const rate = await this.exchangeRate.getUsdtRubRate();
      const usdtDecimalString = (parseFloat(current.amount) / rate).toFixed(USDT_DECIMALS);
      const usdtAtomic = CryptoAmount.fromDecimalString(usdtDecimalString, USDT_DECIMALS).toAtomic();
      if (usdtAtomic <= 0n) {
        throw new BadRequestException('Converted USDT amount is zero, check the requested amount');
      }
      updates.usdtRubRateAtApproval = rate.toFixed(4);
      updates.usdtAmountAtomic = usdtAtomic;
    }

    // Реальная on-chain отправка — здесь, а не в bank-варианте (тот перевод происходит вне
    // платформы вручную, "paid" там — просто бухгалтерская отметка). Для TON платформа сама
    // подписывает и шлёт перевод с hot wallet, т.к. только у неё есть приватный ключ.
    if (newStatus === 'paid' && current.method === 'ton_wallet') {
      if (current.usdtAmountAtomic == null || !current.tonWalletAddress) {
        throw new BadRequestException('Payout request has no fixed USDT amount — approve it first');
      }
      const tag = requestId.replace(/-/g, '').slice(0, 16);
      const txHash = await this.hotWallet.transferJettonToOwner({
        recipientOwnerAddress: current.tonWalletAddress,
        jettonAmountAtomic: current.usdtAmountAtomic,
        forwardComment: `payout:${tag}`,
      });
      updates.tonTxHash = txHash;
    }

    const updated = await this.db
      .update(payoutRequests)
      .set(updates)
      .where(eq(payoutRequests.id, requestId))
      .returning();

    return serializePayoutRequest(updated[0]);
  }
}

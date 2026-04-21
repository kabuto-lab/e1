/**
 * Фоновый опрос TonAPI: события treasury → JettonTransfer с memo → TonEscrowService.recordDeposit.
 * Включается только при TON_INDEXER_ENABLED=true и заданных TON_* для эскроу.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EscrowTonNetwork } from '@escort/db';
import { TonAddress } from '../domain/value-objects/ton-address.vo';
import { EscrowTonRepository } from '../escrow-ton.repository';
import { TonEscrowService } from '../ton-escrow.service';
import type { RecordTonDepositDto } from '../dto/record-ton-deposit.dto';
import type { TonAccountEvent, TonAccountEventsResponse, TonAction } from './tonapi-account-events.types';

function toBigIntLt(lt: number | string): bigint {
  return BigInt(String(lt));
}

function clampTxHash(raw: string): string {
  const t = raw.trim();
  if (t.length <= 128) {
    return t;
  }
  return t.slice(0, 128);
}

function cmpLt(a: number | string, b: number | string): number {
  const ba = toBigIntLt(a);
  const bb = toBigIntLt(b);
  if (ba < bb) {
    return -1;
  }
  if (ba > bb) {
    return 1;
  }
  return 0;
}

@Injectable()
export class TonEscrowIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TonEscrowIndexerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastLt: bigint | null = null;
  private bootstrapDone = false;
  private tickRunning = false;
  private lastTickAt: number | null = null;
  private pollMs = 60_000;

  constructor(
    private readonly config: ConfigService,
    private readonly tonRepo: EscrowTonRepository,
    private readonly tonEscrow: TonEscrowService,
  ) {}

  onModuleInit(): void {
    const enabled = this.config.get<string>('TON_INDEXER_ENABLED');
    if (enabled !== 'true') {
      return;
    }

    const treasury = this.config.get<string>('TON_TREASURY_ADDRESS');
    const jetton = this.config.get<string>('TON_USDT_JETTON_MASTER');
    const network = this.config.get<EscrowTonNetwork | undefined>('TON_NETWORK');
    if (!treasury?.trim() || !jetton?.trim() || !network) {
      this.logger.warn(
        'TON_INDEXER_ENABLED=true but TON_TREASURY_ADDRESS / TON_USDT_JETTON_MASTER / TON_NETWORK missing — indexer idle',
      );
      return;
    }

    this.pollMs = Math.max(5_000, parseInt(this.config.get<string>('TON_INDEXER_POLL_MS') ?? '60000', 10) || 60_000);

    this.logger.log(`TonAPI indexer started (poll every ${this.pollMs} ms)`);
    void this.safeTick();
    this.timer = setInterval(() => void this.safeTick(), this.pollMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async safeTick(): Promise<void> {
    if (this.tickRunning) {
      const gapMs = this.lastTickAt ? Date.now() - this.lastTickAt : 0;
      if (gapMs > this.pollMs * 2) {
        this.logger.warn(`TonAPI indexer stale: last tick ${Math.round(gapMs / 1000)}s ago (poll=${this.pollMs}ms)`);
      }
      return;
    }
    this.tickRunning = true;
    try {
      await this.tick();
      this.lastTickAt = Date.now();
    } catch (e) {
      this.logger.error(`Indexer tick failed: ${(e as Error).message}`);
    } finally {
      this.tickRunning = false;
    }
  }

  private getApiBase(): string {
    const raw = this.config.get<string>('TONAPI_BASE_URL')?.trim();
    if (raw) {
      return raw.replace(/\/$/, '');
    }
    return 'https://tonapi.io';
  }

  private getTreasury(): string {
    return this.config.get<string>('TON_TREASURY_ADDRESS')!.trim();
  }

  private getJettonMaster(): string {
    return this.config.get<string>('TON_USDT_JETTON_MASTER')!.trim();
  }

  private getNetwork(): EscrowTonNetwork {
    return this.config.get<EscrowTonNetwork>('TON_NETWORK')!;
  }

  private getLimit(): number {
    const n = parseInt(this.config.get<string>('TON_INDEXER_EVENTS_LIMIT') ?? '50', 10);
    if (!Number.isFinite(n)) {
      return 50;
    }
    return Math.min(100, Math.max(1, n));
  }

  private async fetchEvents(params: Record<string, string>): Promise<TonAccountEvent[]> {
    const base = this.getApiBase();
    const treasury = this.getTreasury();
    const url = new URL(`${base}/v2/accounts/${encodeURIComponent(treasury)}/events`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { accept: 'application/json' };
    const key = this.config.get<string>('TONAPI_KEY')?.trim();
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`TonAPI HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as TonAccountEventsResponse;
    return Array.isArray(data.events) ? data.events : [];
  }

  private async tick(): Promise<void> {
    const bootstrapAfter = this.config.get<string>('TON_INDEXER_BOOTSTRAP_AFTER_LT')?.trim();
    if (!this.bootstrapDone && bootstrapAfter && /^\d+$/.test(bootstrapAfter)) {
      this.lastLt = BigInt(bootstrapAfter);
      this.bootstrapDone = true;
      this.logger.log(`Indexer cursor from TON_INDEXER_BOOTSTRAP_AFTER_LT=${bootstrapAfter}`);
    }

    if (this.lastLt === null && !this.bootstrapDone) {
      const dbMax = await this.tonRepo.getMaxDepositLogicalTime();
      if (dbMax != null) {
        this.lastLt = dbMax;
        this.bootstrapDone = true;
        this.logger.log(`Indexer cursor from DB max(logical_time)=${dbMax.toString()}`);
      } else {
        await this.bootstrapFromRecent();
        this.bootstrapDone = true;
        return;
      }
    }

    const limit = String(this.getLimit());
    const events = await this.fetchEvents({
      limit,
      sort_order: 'asc',
      after_lt: this.lastLt!.toString(),
    });

    const sorted = [...events].sort((a, b) => cmpLt(a.lt, b.lt));
    for (const ev of sorted) {
      await this.processEvent(ev);
      this.lastLt = this.bigMax(this.lastLt!, toBigIntLt(ev.lt));
    }
  }

  private async bootstrapFromRecent(): Promise<void> {
    const limit = String(this.getLimit());
    const events = await this.fetchEvents({
      limit,
      sort_order: 'desc',
    });

    if (events.length === 0) {
      this.lastLt = 0n;
      this.logger.warn('TonAPI returned no events; cursor lt=0');
      return;
    }

    const sorted = [...events].sort((a, b) => cmpLt(a.lt, b.lt));
    for (const ev of sorted) {
      await this.processEvent(ev);
    }
    this.lastLt = sorted.reduce((m, e) => this.bigMax(m, toBigIntLt(e.lt)), 0n);
    this.logger.log(`Bootstrap processed ${sorted.length} events; cursor lt=${this.lastLt.toString()}`);
  }

  private bigMax(a: bigint, b: bigint): bigint {
    return a > b ? a : b;
  }

  private async processEvent(ev: TonAccountEvent): Promise<void> {
    if (ev.is_scam) {
      return;
    }
    if (ev.in_progress) {
      return;
    }

    for (const action of ev.actions ?? []) {
      await this.processJettonAction(ev, action);
    }
  }

  private extractJetton(action: TonAction): {
    amount: string;
    comment?: string;
    jettonAddress: string;
    recipientAddress: string;
    senderAddress: string;
  } | null {
    if (action.status !== 'ok') {
      return null;
    }
    if (action.type === 'JettonTransfer' && action.JettonTransfer) {
      const j = action.JettonTransfer;
      return {
        amount: j.amount,
        comment: j.comment,
        jettonAddress: j.jetton.address,
        recipientAddress: j.recipient.address,
        senderAddress: j.sender.address,
      };
    }
    if (action.type === 'FlawedJettonTransfer' && action.FlawedJettonTransfer) {
      const j = action.FlawedJettonTransfer;
      return {
        amount: j.received_amount,
        comment: j.comment,
        jettonAddress: j.jetton.address,
        recipientAddress: j.recipient.address,
        senderAddress: j.sender.address,
      };
    }
    return null;
  }

  private async processJettonAction(ev: TonAccountEvent, action: TonAction): Promise<void> {
    const body = this.extractJetton(action);
    if (!body) {
      return;
    }

    const memo = body.comment?.trim();
    if (!memo) {
      return;
    }

    const cfgTreasury = TonAddress.parse(this.getTreasury());
    const cfgJetton = TonAddress.parse(this.getJettonMaster());
    try {
      if (TonAddress.parse(body.jettonAddress).toString() !== cfgJetton.toString()) {
        return;
      }
      // В TonAPI recipient обычно владелец (treasury); при расхождении с сетью можно опросить jetton-wallet.
      if (TonAddress.parse(body.recipientAddress).toString() !== cfgTreasury.toString()) {
        return;
      }
    } catch {
      return;
    }

    const txHash = clampTxHash(action.base_transactions?.[0] ?? ev.event_id);
    if (!txHash) {
      return;
    }

    const dto = {
      memo,
      txHash,
      fromAddressRaw: body.senderAddress.trim(),
      treasuryAddressRaw: cfgTreasury.toString(),
      jettonMasterRaw: cfgJetton.toString(),
      amountAtomic: body.amount.trim(),
      confirmationCount: 1,
      logicalTime: String(ev.lt),
      indexerSource: 'tonapi',
      network: this.getNetwork(),
      rawPayload: {
        event_id: ev.event_id,
        action_type: action.type,
      },
    } as RecordTonDepositDto;

    try {
      await this.tonEscrow.recordDeposit(dto);
    } catch (e) {
      if (e instanceof NotFoundException) {
        return;
      }
      if (e instanceof BadRequestException) {
        this.logger.debug(`Deposit skipped (bad request): ${e.message} tx=${txHash}`);
        return;
      }
      if (e instanceof ConflictException) {
        this.logger.debug(`Deposit skipped (conflict): ${e.message} tx=${txHash}`);
        return;
      }
      this.logger.warn(`recordDeposit failed tx=${txHash}: ${(e as Error).message}`);
    }
  }
}

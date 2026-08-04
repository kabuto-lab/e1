/**
 * Тонкий HTTP-клиент T-Bank (Tinkoff) Acquiring API v2.
 * Документация: https://www.tbank.ru/kassa/dev/payments/
 *
 * Отвечает только за подпись запросов/проверку подписи вебхука и сырые вызовы
 * Init/Confirm/Cancel. Доменная логика (эскроу, состояние брони) — в TbankEscrowService.
 */

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

const DEFAULT_API_URL = 'https://securepay.tbank.ru/v2';

/** Поля, не участвующие в подписи токена (вложенные объекты/сам токен). */
const TOKEN_EXCLUDED_KEYS = new Set(['Token', 'DATA', 'Receipt', 'Shops']);

export interface TbankInitParams {
  OrderId: string;
  /** Сумма в копейках. */
  Amount: number;
  Description?: string;
  /** 'T' — двухстадийная оплата (hold → Confirm/Cancel). Без поля — одностадийная. */
  PayType: 'T';
  NotificationURL: string;
  SuccessURL: string;
  FailURL: string;
}

export interface TbankInitResult {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  TerminalKey: string;
  Status: string;
  PaymentId: string;
  OrderId: string;
  Amount: number;
  PaymentURL?: string;
}

export interface TbankConfirmOrCancelParams {
  PaymentId: string;
  /** Сумма в копейках; без поля — операция на всю сумму платежа. */
  Amount?: number;
}

export interface TbankConfirmOrCancelResult {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  TerminalKey: string;
  Status: string;
  PaymentId: string;
  OrderId: string;
  Amount: number;
  OriginalAmount?: number;
  NewAmount?: number;
}

/** Универсальная форма нотификации T-Bank — используется и для запросов, и для проверки Token вебхука. */
export type TbankScalarPayload = Record<string, string | number | boolean | undefined>;

@Injectable()
export class TbankClientService {
  private readonly logger = new Logger(TbankClientService.name);

  constructor(private readonly config: ConfigService) {}

  private get terminalKey(): string {
    const v = this.config.get<string>('TBANK_TERMINAL_KEY');
    if (!v) {
      throw new ServiceUnavailableException(
        'T-Bank escrow is not configured: задайте TBANK_TERMINAL_KEY и TBANK_PASSWORD в .env',
      );
    }
    return v;
  }

  private get password(): string {
    const v = this.config.get<string>('TBANK_PASSWORD');
    if (!v) {
      throw new ServiceUnavailableException(
        'T-Bank escrow is not configured: задайте TBANK_TERMINAL_KEY и TBANK_PASSWORD в .env',
      );
    }
    return v;
  }

  private get apiUrl(): string {
    return this.config.get<string>('TBANK_API_BASE_URL') ?? DEFAULT_API_URL;
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('TBANK_TERMINAL_KEY') && this.config.get<string>('TBANK_PASSWORD'),
    );
  }

  /**
   * Token = SHA-256(hex) от конкатенации ЗНАЧЕНИЙ всех top-level скалярных полей
   * (без Token/DATA/Receipt/Shops), отсортированных по ключу, + Password как ещё одно поле.
   */
  signToken(payload: TbankScalarPayload, password: string): string {
    const withPassword: TbankScalarPayload = { ...payload, Password: password };
    const keys = Object.keys(withPassword)
      .filter((k) => !TOKEN_EXCLUDED_KEYS.has(k) && withPassword[k] !== undefined)
      .sort();
    const concatenated = keys.map((k) => String(withPassword[k])).join('');
    return createHash('sha256').update(concatenated, 'utf8').digest('hex');
  }

  /** Проверка подписи входящего вебхука. */
  verifyToken(payload: TbankScalarPayload & { Token?: string }): boolean {
    if (!payload.Token) return false;
    const expected = this.signToken(payload, this.password);
    return expected === payload.Token;
  }

  private async post<T>(path: string, body: TbankScalarPayload): Promise<T> {
    const terminalKey = this.terminalKey;
    const password = this.password;
    const fullBody: TbankScalarPayload = { ...body, TerminalKey: terminalKey };
    const token = this.signToken(fullBody, password);

    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fullBody, Token: token }),
    });

    if (!response.ok) {
      this.logger.error(`T-Bank ${path} HTTP ${response.status}`);
      throw new ServiceUnavailableException(`T-Bank API error: HTTP ${response.status}`);
    }

    const json = (await response.json()) as T & {
      Success?: boolean;
      ErrorCode?: string;
      Message?: string;
      Details?: string;
    };
    if (json.Success === false) {
      this.logger.error(
        `T-Bank ${path} failed: ErrorCode=${json.ErrorCode} Message=${json.Message ?? ''} Details=${json.Details ?? ''} body=${JSON.stringify(fullBody)}`,
      );
      throw new ServiceUnavailableException(
        `T-Bank ${path} failed: ${json.Message ?? json.ErrorCode ?? 'unknown error'}${json.Details ? ` (${json.Details})` : ''}`,
      );
    }

    return json as T;
  }

  async init(params: TbankInitParams): Promise<TbankInitResult> {
    return this.post<TbankInitResult>('/Init', params as unknown as TbankScalarPayload);
  }

  /** Подтвердить (списать) захолдированный платёж — двухстадийная оплата, шаг 2. */
  async confirm(params: TbankConfirmOrCancelParams): Promise<TbankConfirmOrCancelResult> {
    return this.post<TbankConfirmOrCancelResult>(
      '/Confirm',
      params as unknown as TbankScalarPayload,
    );
  }

  /** Отменить холд (до Confirm) или вернуть деньги (после Confirm). */
  async cancel(params: TbankConfirmOrCancelParams): Promise<TbankConfirmOrCancelResult> {
    return this.post<TbankConfirmOrCancelResult>(
      '/Cancel',
      params as unknown as TbankScalarPayload,
    );
  }
}

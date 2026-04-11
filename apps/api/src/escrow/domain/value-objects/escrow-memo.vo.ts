import { BadRequestException } from '@nestjs/common';

/** Совпадает с `expected_memo` в `escrow_transactions` (varchar 128). */
export const ESCROW_MEMO_MAX_LENGTH = 128;

/**
 * Memo / comment / payload для сопоставления входящего jetton-перевода с записью эскроу (один treasury + memo).
 *
 * Разрешён безопасный набор символов без пробелов и управляющих — чтобы снизить риск инъекций в логах и парсерах.
 */
const MEMO_BODY_RE = /^[A-Za-z0-9._-]+$/;

/**
 * Префикс по умолчанию для генерируемых memo (можно сменить в use-case при необходимости).
 */
const DEFAULT_MEMO_PREFIX = 'E1';

export class EscrowMemo {
  private constructor(private readonly value: string) {}

  /**
   * Валидация произвольной memo-строки из конфига или сети (после trim).
   */
  static parse(input: string): EscrowMemo {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('EscrowMemo: empty string');
    }
    if (trimmed.length > ESCROW_MEMO_MAX_LENGTH) {
      throw new BadRequestException(
        `EscrowMemo: max length is ${ESCROW_MEMO_MAX_LENGTH}, got ${trimmed.length}`,
      );
    }
    if (!MEMO_BODY_RE.test(trimmed)) {
      throw new BadRequestException(
        'EscrowMemo: only A–Z, a–z, 0–9, dot, underscore and hyphen are allowed',
      );
    }
    return new EscrowMemo(trimmed);
  }

  /**
   * Детерминированная memo из UUID эскроу: `E1` + UUID без дефисов (36 символов → итого 34).
   */
  static fromEscrowUuid(escrowId: string): EscrowMemo {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const trimmed = escrowId.trim();
    if (!uuidRe.test(trimmed)) {
      throw new BadRequestException('EscrowMemo: invalid escrow UUID');
    }
    const compact = trimmed.replace(/-/g, '').toLowerCase();
    const raw = `${DEFAULT_MEMO_PREFIX}${compact}`;
    return EscrowMemo.parse(raw);
  }

  toString(): string {
    return this.value;
  }

  equals(other: EscrowMemo): boolean {
    return this.value === other.value;
  }

  /**
   * Сравнение с сырой строкой из индексера (trim; регистр как в БД).
   */
  matchesChainMemo(candidate: string | null | undefined): boolean {
    if (candidate == null) {
      return false;
    }
    return candidate.trim() === this.value;
  }
}

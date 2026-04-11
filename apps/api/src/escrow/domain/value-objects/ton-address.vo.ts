import { BadRequestException } from '@nestjs/common';

/**
 * User-friendly TON address (bounceable / non-bounceable, mainnet or testnet prefix).
 * Длина 48 символов, base64url-подмножество после префикса.
 */
const TON_FRIENDLY_RE = /^(?:EQ|UQ|kQ)[A-Za-z0-9_-]{46}$/;

/**
 * Raw-формат: workchain:64-hex (стандартный 256-bit account id).
 */
const TON_RAW_RE = /^(-?[0-9]+):([a-fA-F0-9]{64})$/;

/**
 * Строковый идентификатор кошелька/контракта в TON (user-friendly или raw).
 * Храните в БД как нормализованную строку без лишних пробелов; сравнение регистрозависимое для friendly.
 */
export class TonAddress {
  private constructor(private readonly value: string) {}

  /**
   * Разбор адреса из строки (trim). Поддерживаются user-friendly (EQ/UQ/kQ…) и raw `workchain:hex`.
   */
  static parse(input: string): TonAddress {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('TonAddress: empty string');
    }
    if (TON_FRIENDLY_RE.test(trimmed)) {
      return new TonAddress(trimmed);
    }
    const rawMatch = trimmed.match(TON_RAW_RE);
    if (rawMatch) {
      const wc = rawMatch[1];
      const hex = rawMatch[2].toLowerCase();
      return new TonAddress(`${wc}:${hex}`);
    }
    throw new BadRequestException(
      'TonAddress: expected user-friendly (e.g. EQ…48 chars) or raw workchain:64-hex',
    );
  }

  /** Строка для БД / API / сравнения с индексером. */
  toString(): string {
    return this.value;
  }

  equals(other: TonAddress): boolean {
    return this.value === other.value;
  }
}

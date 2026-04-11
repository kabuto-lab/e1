import { BadRequestException } from '@nestjs/common';

/** Делитель для basis points: 10_000 = 100%, 1_000 = 10%. */
const BASIS_POINTS_SCALE = 10_000n;

const DECIMAL_STRING_RE = /^\d+(\.\d+)?$/;

/**
 * Денежная величина в блокчейн-стиле: только целое число минимальных единиц (`bigint`) и явные decimals актива (например 6 для USDT jetton).
 *
 * Не использует `number` для суммы; арифметика — в BigInt.
 */
export class CryptoAmount {
  private constructor(
    private readonly atomic: bigint,
    private readonly decimals: number,
  ) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      throw new BadRequestException(
        `CryptoAmount: decimals must be an integer between 0 and 18, got ${decimals}`,
      );
    }
    if (atomic < 0n) {
      throw new BadRequestException('CryptoAmount: negative atomic amounts are not allowed');
    }
  }

  /**
   * Создание из уже нормализованного значения в минимальных единицах.
   */
  static fromAtomic(atomic: bigint, decimals: number): CryptoAmount {
    return new CryptoAmount(atomic, decimals);
  }

  /**
   * Разбор неотрицательной десятичной строки без экспоненты (например `"1250.50"`).
   * Дробная часть дополняется нулями справа или отклоняется, если длиннее `decimals`.
   */
  static fromDecimalString(amount: string, decimals: number): CryptoAmount {
    const trimmed = amount.trim();
    if (trimmed === '' || !DECIMAL_STRING_RE.test(trimmed)) {
      throw new BadRequestException(
        `CryptoAmount: invalid decimal string (use digits and optional single dot): "${amount}"`,
      );
    }
    const [intRaw, fracRaw = ''] = trimmed.split('.');
    if (decimals === 0) {
      if (fracRaw !== '') {
        throw new BadRequestException(
          'CryptoAmount: fractional part is not allowed when decimals is 0',
        );
      }
      const intNormalized = intRaw.replace(/^0+/, '') || '0';
      return new CryptoAmount(BigInt(intNormalized), 0);
    }
    if (fracRaw.length > decimals) {
      throw new BadRequestException(
        `CryptoAmount: fractional part exceeds ${decimals} decimal places`,
      );
    }
    const intNormalized = intRaw.replace(/^0+/, '') || '0';
    const fracPadded = fracRaw.padEnd(decimals, '0');
    const scale = 10n ** BigInt(decimals);
    const atomic = BigInt(intNormalized) * scale + BigInt(fracPadded);
    return new CryptoAmount(atomic, decimals);
  }

  /** Минимальные единицы актива. */
  toAtomic(): bigint {
    return this.atomic;
  }

  getDecimals(): number {
    return this.decimals;
  }

  /**
   * Человекочитаемое представление без научной нотации; лишние нули в дробной части срезаются.
   */
  toHumanReadable(): string {
    const scale = 10n ** BigInt(this.decimals);
    const intPart = this.atomic / scale;
    const fracPart = this.atomic % scale;
    if (fracPart === 0n) {
      return intPart.toString();
    }
    const fracStr = fracPart
      .toString()
      .padStart(this.decimals, '0')
      .replace(/0+$/, '');
    return `${intPart.toString()}.${fracStr}`;
  }

  add(other: CryptoAmount): CryptoAmount {
    this.assertSameDecimals(other, 'add');
    return new CryptoAmount(this.atomic + other.atomic, this.decimals);
  }

  /**
   * Вычитание; результат не может быть отрицательным.
   */
  subtract(other: CryptoAmount): CryptoAmount {
    this.assertSameDecimals(other, 'subtract');
    const next = this.atomic - other.atomic;
    if (next < 0n) {
      throw new BadRequestException('CryptoAmount: subtract would yield a negative amount');
    }
    return new CryptoAmount(next, this.decimals);
  }

  /**
   * Доля от суммы в basis points: делитель 10_000 = 100%.
   * Пример: `basisPoints === 1000` → 10% от суммы, результат округляется к нулю (в сторону нуля).
   */
  multiply(basisPoints: number): CryptoAmount {
    if (!Number.isInteger(basisPoints) || basisPoints < 0) {
      throw new BadRequestException(
        'CryptoAmount: basisPoints must be a non-negative integer',
      );
    }
    if (basisPoints > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException('CryptoAmount: basisPoints exceeds safe integer range');
    }
    const bp = BigInt(basisPoints);
    const product = (this.atomic * bp) / BASIS_POINTS_SCALE;
    return new CryptoAmount(product, this.decimals);
  }

  gte(other: CryptoAmount): boolean {
    this.assertSameDecimals(other, 'gte');
    return this.atomic >= other.atomic;
  }

  equals(other: CryptoAmount): boolean {
    return this.decimals === other.decimals && this.atomic === other.atomic;
  }

  private assertSameDecimals(other: CryptoAmount, op: string): void {
    if (this.decimals !== other.decimals) {
      throw new BadRequestException(
        `CryptoAmount: decimals mismatch in ${op} (${this.decimals} vs ${other.decimals})`,
      );
    }
  }
}

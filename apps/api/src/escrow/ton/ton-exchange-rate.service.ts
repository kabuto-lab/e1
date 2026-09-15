/**
 * Курс USDT/RUB для конвертации цены брони (RUB) в сумму TON-эскроу (USDT).
 * Публичный эндпоинт CoinGecko, без ключа; результат кешируется на TTL, чтобы не долбить
 * внешний API на каждый createIntent и не зависеть от него при кратковременных сбоях.
 */

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=rub';
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class TonExchangeRateService {
  private readonly logger = new Logger(TonExchangeRateService.name);
  private cached: { rate: number; fetchedAt: number } | null = null;

  async getUsdtRubRate(): Promise<number> {
    if (this.cached && Date.now() - this.cached.fetchedAt < CACHE_TTL_MS) {
      return this.cached.rate;
    }

    try {
      const response = await fetch(COINGECKO_URL, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`CoinGecko responded with status ${response.status}`);
      }
      const data = (await response.json()) as { tether?: { rub?: number } };
      const rate = data.tether?.rub;
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
        throw new Error('CoinGecko response missing tether.rub');
      }
      this.cached = { rate, fetchedAt: Date.now() };
      return rate;
    } catch (e) {
      if (this.cached) {
        this.logger.warn(
          `getUsdtRubRate: fetch failed (${(e as Error).message}), using stale cached rate=${this.cached.rate}`,
        );
        return this.cached.rate;
      }
      this.logger.error(`getUsdtRubRate: failed and no cache available: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Не удалось получить курс USDT/RUB, попробуйте позже');
    }
  }
}

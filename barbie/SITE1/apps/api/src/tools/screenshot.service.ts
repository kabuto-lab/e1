/**
 * ScreenshotService — headless Chromium (Playwright) для предпросмотра сайтов.
 *
 * Flow:
 *   1. SSRF pre-validation: ToolsService.assertPublicHost(hostname)
 *   2. Кеш-lookup по sha256(url + flag): MinIO HEAD на tools/screenshots/<sha>.png
 *   3. Если cache miss — запуск Chromium (или reuse singleton),
 *      navigation, screenshot, S3 upload, return URL.
 *
 * Performance:
 *   - Browser instance создаётся лениво при первом запросе (~1-2s warmup).
 *   - Все последующие запросы reuse'ят browser, создают только context+page
 *     (~100ms overhead) → 3-5s total с page load.
 *   - При onModuleDestroy браузер закрывается.
 *
 * Безопасность:
 *   - URL validation (http/https, max length) на DTO уровне.
 *   - SSRF pre-check через ToolsService.assertPublicHost.
 *   - **TOCTOU window**: между нашим dns.lookup и реальным DNS-резолвом
 *     внутри Chromium attacker DNS может вернуть private IP. Mitigation —
 *     route interception (page.route): любая sub-request с private hostname
 *     блокируется. ВНИМАНИЕ: первоначальный GET тоже проходит через
 *     route — там делаем повторный assertPublicHost.
 *   - Endpoint защищён @RequireRole('platform-admin') — abuse surface ограничен.
 *
 * Кеш:
 *   - Key: tools/screenshots/<sha256(url + ':vp'|':full')>.png
 *   - TTL: 30 дней через Cache-Control header в S3 putObject.
 *   - Для force-refresh — пока не реализовано (можно добавить ?refresh=1).
 */
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  RequestTimeoutException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { chromium, type Browser } from 'playwright';

import { S3Service } from '../storage/s3.service';
import { ToolsService } from './tools.service';
import type { ScreenshotResultDto } from './dto/screenshot.dto';

const NAVIGATION_TIMEOUT_MS = 15_000;
const SCREENSHOT_TIMEOUT_MS = 10_000;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;
const MAX_PNG_BYTES = 8 * 1024 * 1024; // 8 MiB hard cap

@Injectable()
export class ScreenshotService implements OnModuleDestroy {
  private readonly logger = new Logger(ScreenshotService.name);
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly tools: ToolsService,
    private readonly s3: S3Service,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing headless Chromium on module destroy');
      try {
        await this.browser.close();
      } catch (err) {
        this.logger.warn(`Browser close failed: ${err instanceof Error ? err.message : err}`);
      }
      this.browser = null;
    }
  }

  async capture(url: string, opts: { fullPage?: boolean } = {}): Promise<ScreenshotResultDto> {
    // 1. URL parsing
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException({ code: 'INVALID_URL' });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException({ code: 'SCHEME_FORBIDDEN' });
    }

    // 2. SSRF pre-validation. Бросает 400 BadRequest при private IP.
    await this.tools.assertPublicHost(parsed.hostname);

    // 3. Cache lookup
    const flag = opts.fullPage ? ':full' : ':vp';
    const sha = createHash('sha256').update(url + flag).digest('hex');
    const cacheKey = `tools/screenshots/${sha}.png`;

    if (await this.s3.exists(cacheKey)) {
      this.logger.debug(`Screenshot cache hit: ${cacheKey} for ${url}`);
      return {
        url: this.s3.publicUrlFor(cacheKey),
        key: cacheKey,
        sizeBytes: 0, // exists() без HEAD-body — реальный размер достанем при необходимости
        width: opts.fullPage ? VIEWPORT_WIDTH : VIEWPORT_WIDTH,
        height: opts.fullPage ? 0 : VIEWPORT_HEIGHT, // full-page height неизвестна без HEAD
        cached: true,
        durationMs: 0,
      };
    }

    // 4. Capture
    const startedAt = Date.now();
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      userAgent: 'NAS-Screenshot/0.1 (+headless-chromium)',
      // Disable обходы JavaScript, чтобы соответствовать тому, что увидит юзер.
      bypassCSP: false,
      javaScriptEnabled: true,
    });

    // Defence-in-depth: на каждом sub-request проверяем что host публичный.
    // Это закрывает TOCTOU и блокирует side-channel'ы через подгружаемые
    // assets с private IP (mixed-origin CSS/JS/img).
    await context.route('**/*', async (route) => {
      try {
        const u = new URL(route.request().url());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          await route.abort('blockedbyresponse');
          return;
        }
        await this.tools.assertPublicHost(u.hostname);
        await route.continue();
      } catch {
        await route.abort('blockedbyresponse');
      }
    });

    const page = await context.newPage();
    let buf: Buffer;
    let actualHeight = VIEWPORT_HEIGHT;
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      buf = await page.screenshot({
        fullPage: !!opts.fullPage,
        type: 'png',
        timeout: SCREENSHOT_TIMEOUT_MS,
      });
      if (opts.fullPage) {
        // page.evaluate runs в браузерном контексте, но TS видит наш Node-код —
        // используем string-form чтобы не тащить dom lib в tsconfig только ради этого.
        const h = (await page.evaluate(
          'document.documentElement.scrollHeight',
        )) as unknown;
        if (typeof h === 'number') actualHeight = h;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Timeout') || msg.includes('timed out')) {
        throw new RequestTimeoutException({ code: 'NAVIGATION_TIMEOUT', url, message: msg });
      }
      throw new BadRequestException({ code: 'CAPTURE_FAILED', url, message: msg });
    } finally {
      await context.close().catch(() => {
        /* swallow — main flow ok */
      });
    }

    if (buf.length > MAX_PNG_BYTES) {
      throw new BadRequestException({
        code: 'SCREENSHOT_TOO_LARGE',
        size: buf.length,
        max: MAX_PNG_BYTES,
      });
    }

    // 5. Upload
    await this.s3.putObject({
      key: cacheKey,
      body: buf,
      contentType: 'image/png',
      cacheControl: 'public, max-age=2592000', // 30d
      metadata: {
        'source-url': url.slice(0, 1024),
        tool: 'screenshot',
        'full-page': opts.fullPage ? '1' : '0',
      },
    });

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Screenshot captured: ${url} → ${cacheKey} (${buf.length}b, ${durationMs}ms${opts.fullPage ? ', full-page' : ''})`,
    );

    return {
      url: this.s3.publicUrlFor(cacheKey),
      key: cacheKey,
      sizeBytes: buf.length,
      width: VIEWPORT_WIDTH,
      height: actualHeight,
      cached: false,
      durationMs,
    };
  }

  /**
   * Lazy-init singleton Chromium instance. Все capture()-запросы создают
   * только новые context+page поверх этого браузера; warmup ~1-2s
   * происходит только при первом обращении.
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (this.browserPromise) return this.browserPromise;
    this.logger.log('Launching headless Chromium…');
    this.browserPromise = chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
    try {
      this.browser = await this.browserPromise;
      this.logger.log('Chromium ready');
      return this.browser;
    } finally {
      this.browserPromise = null;
    }
  }
}

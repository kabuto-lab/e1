/**
 * /v1/chat/stream — SSE поток событий для текущего пользователя.
 *
 * Клиент использует EventSource API:
 *
 *   const es = new EventSource('/api/v1/chat/stream?token=' + accessToken);
 *   es.onmessage = (e) => { const event = JSON.parse(e.data); ... };
 *
 * Особенности:
 *  - EventSource не поддерживает custom headers, поэтому токен передаётся
 *    через query (`?token=`). Это безопасно при HTTPS; см. main.ts —
 *    cors restricts origin.
 *  - Last-Event-ID берётся либо из заголовка (браузер шлёт автоматически при
 *    reconnect), либо из query `?since=<bigint>` (для ручного catch-up).
 *  - Keep-alive ping: каждые 25 сек event { type: 'ping' } — держит соединение
 *    через nginx-таймауты.
 */
import {
  Controller,
  ForbiddenException,
  Headers,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Observable, concat, defer, finalize, from, interval, map, merge, mergeMap } from 'rxjs';

import { TenantGuard } from '../tenant-context/tenant.guard';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

import { ChatEventsService } from './events.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller({ path: 'chat', version: '1' })
export class ChatStreamController {
  constructor(
    private readonly events: ChatEventsService,
    private readonly tenantCtx: TenantContextService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Public() // JWT валидируем вручную по `token` query (EventSource не шлёт headers).
  @Sse('stream')
  @ApiOperation({
    summary:
      'SSE live stream of chat events. Auth via ?token=, resume via Last-Event-ID header or ?since=',
  })
  stream(
    @Query('token') token: string | undefined,
    @Query('since') sinceQuery: string | undefined,
    @Headers('last-event-id') lastEventIdHeader: string | undefined,
  ): Observable<MessageEvent> {
    if (!token) {
      throw new UnauthorizedException({ code: 'TOKEN_REQUIRED' });
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID' });
    }

    if (payload.kind !== 'tenant') {
      throw new ForbiddenException({ code: 'TENANT_SCOPE_REQUIRED' });
    }

    const tenantId = this.tenantCtx.requireTenantId();
    if (payload.tenantId !== tenantId) {
      throw new ForbiddenException({ code: 'TENANT_OWNERSHIP_MISMATCH' });
    }

    const userId = payload.sub;

    const sinceRaw = lastEventIdHeader ?? sinceQuery;
    const since = sinceRaw ? this.parseSince(sinceRaw) : null;

    // 1. catch-up: emit each persisted event as its own SSE frame.
    const catchUp$: Observable<MessageEvent> =
      since !== null
        ? defer(() => from(this.events.catchUp(tenantId, userId, since))).pipe(
            mergeMap((events) => from(events)),
            map((ev) => ({
              id: ev.id,
              type: 'message',
              data: JSON.stringify(ev),
            })),
          )
        : from([] as MessageEvent[]);

    // 2. live: новые события через in-process pub/sub.
    const live$: Observable<MessageEvent> = this.events.subscribe(userId).pipe(
      map((ev) => ({
        id: ev.id,
        type: 'message',
        data: JSON.stringify(ev),
      })),
      finalize(() => this.events.release(userId)),
    );

    // 3. keep-alive — против nginx idle timeout.
    const keepAlive$: Observable<MessageEvent> = interval(25_000).pipe(
      map(() => ({ type: 'ping', data: '' })),
    );

    return concat(catchUp$, merge(live$, keepAlive$));
  }

  private parseSince(raw: string): bigint | null {
    try {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    } catch {
      return null;
    }
  }
}

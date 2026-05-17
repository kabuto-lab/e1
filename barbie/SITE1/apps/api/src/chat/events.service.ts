/**
 * ChatEventsService — in-process pub/sub шина для SSE (Server-Sent Events).
 *
 * Принцип: каждый событийный write идёт в две стороны:
 *  1. Запись в `chat_events` таблицу — даёт catch-up при reconnect через
 *     `?since=<bigint>`.
 *  2. Публикация в Subject per userId — мгновенная доставка в открытые SSE
 *     соединения (если есть).
 *
 * Phase 0: один Nest-инстанс. Phase 1+: переход на Postgres LISTEN/NOTIFY или
 * Redis pubsub, чтобы держать несколько replica — публичный API сервиса не
 * меняется, меняется только реализация publish().
 */
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import {
  chatChannelMembers,
  chatEvents,
  type ChatEventType,
} from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';

export interface ChatStreamEvent {
  /** chat_events.id — bigint as string в JSON. */
  id: string;
  /** Текущий тенант, в котором произошло событие. */
  tenantId: string;
  /** Канал-источник. */
  channelId: string;
  /** Тип события. */
  type: ChatEventType;
  /** Payload — DTO-shape, зависит от type. */
  payload: object;
  /** ISO timestamp. */
  createdAt: string;
}

interface UserBus {
  subject: Subject<ChatStreamEvent>;
  refCount: number;
}

@Injectable()
export class ChatEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatEventsService.name);
  /** Per-user (tenant_users.user_id) bus — несколько вкладок одного юзера шарят Subject. */
  private readonly buses = new Map<string, UserBus>();

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Persist event + fan-out to all current channel members' SSE streams.
   * Возвращает chat_events.id для отображения в Last-Event-ID.
   */
  async publish(
    tenantId: string,
    channelId: string,
    type: ChatEventType,
    payload: object,
  ): Promise<string> {
    const [row] = await this.db
      .insert(chatEvents)
      .values({ tenantId, channelId, eventType: type, payload })
      .returning({ id: chatEvents.id, createdAt: chatEvents.createdAt });

    const event: ChatStreamEvent = {
      id: row.id.toString(),
      tenantId,
      channelId,
      type,
      payload,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };

    const members = await this.db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.tenantId, tenantId),
        ),
      );

    for (const { userId } of members) {
      const bus = this.buses.get(userId);
      if (bus) bus.subject.next(event);
    }

    return event.id;
  }

  /**
   * Подписка на live-поток для пользователя.
   * Контроллер должен вызвать .release(userId) когда соединение закрывается,
   * иначе Subject утечёт.
   */
  subscribe(userId: string): Observable<ChatStreamEvent> {
    let bus = this.buses.get(userId);
    if (!bus) {
      bus = { subject: new Subject<ChatStreamEvent>(), refCount: 0 };
      this.buses.set(userId, bus);
    }
    bus.refCount += 1;
    return bus.subject.asObservable();
  }

  release(userId: string): void {
    const bus = this.buses.get(userId);
    if (!bus) return;
    bus.refCount -= 1;
    if (bus.refCount <= 0) {
      bus.subject.complete();
      this.buses.delete(userId);
    }
  }

  /**
   * Catch-up при reconnect: вернуть события для каналов пользователя с id > since.
   * Лимит 500 — клиент при бо́льшем lag должен сделать full sync через REST.
   */
  async catchUp(
    tenantId: string,
    userId: string,
    since: bigint,
    limit = 500,
  ): Promise<ChatStreamEvent[]> {
    const memberRows = await this.db
      .select({ channelId: chatChannelMembers.channelId })
      .from(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.tenantId, tenantId),
          eq(chatChannelMembers.userId, userId),
        ),
      );

    if (memberRows.length === 0) return [];

    const rows = await this.db
      .select()
      .from(chatEvents)
      .where(
        and(
          eq(chatEvents.tenantId, tenantId),
          inArray(
            chatEvents.channelId,
            memberRows.map((m) => m.channelId),
          ),
          gt(chatEvents.id, since),
        ),
      )
      .orderBy(sql`${chatEvents.id} asc`)
      .limit(limit);

    return rows.map((row) => ({
      id: row.id.toString(),
      tenantId: row.tenantId,
      channelId: row.channelId,
      type: row.eventType as ChatEventType,
      payload: row.payload as object,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    }));
  }

  onModuleDestroy(): void {
    for (const bus of this.buses.values()) bus.subject.complete();
    this.buses.clear();
    this.logger.log('ChatEventsService destroyed, all subjects closed.');
  }
}

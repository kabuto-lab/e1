/**
 * MessagesService — CRUD сообщений + публикация SSE-событий.
 *
 * Идемпотентность POST не делаем (DM-чаты обычно отправляют один раз и
 * пользователь видит результат); если понадобится — добавить идемпотентный ключ
 * по образцу AppointmentsService.
 */
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, lt, sql } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import {
  chatChannels,
  chatChannelMembers,
  chatMessages,
  type ChatAttachment,
} from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';

import { ChatEventsService } from './events.service';
import type { CreateMessageDto } from './dto/create-message.dto';
import type { UpdateMessageDto } from './dto/update-message.dto';
import type { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import type { MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantCtx: TenantContextService,
    private readonly events: ChatEventsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    channelId: string,
    query: ListMessagesQueryDto,
  ): Promise<MessageResponseDto[]> {
    const tenantId = this.tenantCtx.requireTenantId();
    await this.assertMember(tenantId, channelId, user.id);

    const limit = Math.min(query.limit ?? 50, 200);

    const conditions = [
      eq(chatMessages.tenantId, tenantId),
      eq(chatMessages.channelId, channelId),
    ];
    if (query.before) {
      const [pivot] = await this.db
        .select({ createdAt: chatMessages.createdAt })
        .from(chatMessages)
        .where(and(eq(chatMessages.id, query.before), eq(chatMessages.tenantId, tenantId)))
        .limit(1);
      if (pivot) {
        conditions.push(lt(chatMessages.createdAt, pivot.createdAt));
      }
    }

    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    // Возвращаем в хронологическом порядке (newest last) — удобно для UI.
    return rows.reverse().map((r) => this.toResponse(r));
  }

  async create(
    user: AuthenticatedUser,
    channelId: string,
    dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();
    await this.assertMember(tenantId, channelId, user.id);
    await this.assertChannelOpen(tenantId, channelId);

    if (dto.replyToMessageId) {
      const [reply] = await this.db
        .select({ channelId: chatMessages.channelId })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.id, dto.replyToMessageId),
            eq(chatMessages.tenantId, tenantId),
          ),
        )
        .limit(1);
      if (!reply || reply.channelId !== channelId) {
        throw new BadRequestException({ code: 'REPLY_TARGET_NOT_IN_CHANNEL' });
      }
    }

    const attachments: ChatAttachment[] =
      dto.attachments?.map((a) => ({
        mediaKey: a.mediaKey,
        mime: a.mime,
        size: a.size,
        name: a.name,
      })) ?? [];

    const message = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(chatMessages)
        .values({
          tenantId,
          channelId,
          authorUserId: user.id,
          body: dto.body,
          attachments,
          replyToMessageId: dto.replyToMessageId ?? null,
        })
        .returning();

      await tx
        .update(chatChannels)
        .set({ lastMessageAt: row.createdAt, updatedAt: sql`now()` })
        .where(
          and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)),
        );

      return row;
    });

    const response = this.toResponse(message);
    await this.events.publish(tenantId, channelId, 'message.created', response);
    return response;
  }

  async update(
    user: AuthenticatedUser,
    messageId: string,
    dto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();

    const [existing] = await this.db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.tenantId, tenantId)))
      .limit(1);
    if (!existing) throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND' });
    if (existing.authorUserId !== user.id) {
      throw new ForbiddenException({ code: 'AUTHOR_ONLY' });
    }
    if (existing.deletedAt) {
      throw new BadRequestException({ code: 'MESSAGE_DELETED' });
    }
    await this.assertChannelOpen(tenantId, existing.channelId);

    const [updated] = await this.db
      .update(chatMessages)
      .set({ body: dto.body, editedAt: sql`now()` })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.tenantId, tenantId)))
      .returning();

    const response = this.toResponse(updated);
    await this.events.publish(tenantId, updated.channelId, 'message.edited', {
      id: response.id,
      channelId: response.channelId,
      body: response.body,
      editedAt: response.editedAt,
    });
    return response;
  }

  async remove(user: AuthenticatedUser, messageId: string): Promise<{ deleted: true }> {
    const tenantId = this.tenantCtx.requireTenantId();

    const [existing] = await this.db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.tenantId, tenantId)))
      .limit(1);
    if (!existing) throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND' });
    if (existing.authorUserId !== user.id) {
      throw new ForbiddenException({ code: 'AUTHOR_ONLY' });
    }
    await this.assertChannelOpen(tenantId, existing.channelId);

    await this.db
      .update(chatMessages)
      .set({ deletedAt: sql`now()`, body: '' })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.tenantId, tenantId)));

    await this.events.publish(tenantId, existing.channelId, 'message.deleted', {
      id: messageId,
      channelId: existing.channelId,
    });
    return { deleted: true };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async assertMember(
    tenantId: string,
    channelId: string,
    userId: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.userId, userId),
          eq(chatChannelMembers.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new ForbiddenException({ code: 'CHANNEL_MEMBER_REQUIRED' });
    }
  }

  /**
   * Архивированный канал — read-only. Список истории и unread-счётчики работают,
   * но новые сообщения / edit / delete отбиваются 400 CHANNEL_ARCHIVED.
   */
  private async assertChannelOpen(
    tenantId: string,
    channelId: string,
  ): Promise<void> {
    const [ch] = await this.db
      .select({ archivedAt: chatChannels.archivedAt })
      .from(chatChannels)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)))
      .limit(1);
    if (!ch) throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND' });
    if (ch.archivedAt) throw new BadRequestException({ code: 'CHANNEL_ARCHIVED' });
  }

  private toResponse(row: typeof chatMessages.$inferSelect): MessageResponseDto {
    return {
      id: row.id,
      channelId: row.channelId,
      authorUserId: row.authorUserId,
      body: row.deletedAt ? '' : row.body,
      attachments: row.deletedAt ? [] : (row.attachments as ChatAttachment[]),
      replyToMessageId: row.replyToMessageId,
      editedAt: row.editedAt ? new Date(row.editedAt).toISOString() : null,
      deletedAt: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }
}

/**
 * ChatService — CRUD каналов и членов внутри тенанта.
 *
 * Все операции tenant-scoped через TenantContextService.
 *
 * Бизнес-правила:
 *  - DM уникальна по паре (caller, other). Повторный POST возвращает существующий канал.
 *  - В group канал caller сразу попадает как 'admin', остальные — как 'member'.
 *  - Все memberIds должны быть `tenant_users` текущего тенанта в статусе 'active'.
 *    Роль client исключаем — это staff-only чат.
 *  - Только admin канала может переименовать / архивировать / добавлять / удалять members.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import {
  chatChannels,
  chatChannelMembers,
  chatMessages,
  tenantUsers,
  users,
  type ChatChannelType,
  type ChatMemberRole,
} from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';

import { ChatEventsService } from './events.service';
import type { CreateChannelDto } from './dto/create-channel.dto';
import type { UpdateChannelDto } from './dto/update-channel.dto';
import type { AddMemberDto } from './dto/add-member.dto';
import type {
  ChannelMemberDto,
  ChannelResponseDto,
} from './dto/channel-response.dto';

const STAFF_ROLES = ['tenant-admin', 'salon-manager', 'master'] as const;

/**
 * Маркер единственного «общего чата сотрудников» тенанта. Кладётся в `dmKey`
 * (у group обычно NULL; partial-uniq dmKey действует только для type='dm', так
 * что коллизии нет) — позволяет найти/создать общий канал без миграции схемы.
 */
const GENERAL_DM_KEY = '__general__';
const GENERAL_TITLE = 'Общий чат сотрудников';

@Injectable()
export class ChatService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantCtx: TenantContextService,
    private readonly events: ChatEventsService,
  ) {}

  // ── Channels ──────────────────────────────────────────────────────────────

  async listForUser(user: AuthenticatedUser): Promise<ChannelResponseDto[]> {
    const tenantId = this.tenantCtx.requireTenantId();

    const channels = await this.db
      .select({
        id: chatChannels.id,
        tenantId: chatChannels.tenantId,
        type: chatChannels.type,
        title: chatChannels.title,
        salonId: chatChannels.salonId,
        createdBy: chatChannels.createdBy,
        lastMessageAt: chatChannels.lastMessageAt,
        archivedAt: chatChannels.archivedAt,
        createdAt: chatChannels.createdAt,
        updatedAt: chatChannels.updatedAt,
      })
      .from(chatChannels)
      .innerJoin(
        chatChannelMembers,
        and(
          eq(chatChannelMembers.channelId, chatChannels.id),
          eq(chatChannelMembers.userId, user.id),
        ),
      )
      .where(and(eq(chatChannels.tenantId, tenantId), isNull(chatChannels.archivedAt)))
      .orderBy(sql`coalesce(${chatChannels.lastMessageAt}, ${chatChannels.createdAt}) desc`);

    if (channels.length === 0) return [];

    const channelIds = channels.map((c) => c.id);

    const memberRows = await this.db
      .select({
        channelId: chatChannelMembers.channelId,
        userId: chatChannelMembers.userId,
        role: chatChannelMembers.role,
        lastReadAt: chatChannelMembers.lastReadAt,
        muted: chatChannelMembers.muted,
        joinedAt: chatChannelMembers.joinedAt,
        name: users.name,
        email: users.email,
      })
      .from(chatChannelMembers)
      .leftJoin(users, eq(users.id, chatChannelMembers.userId))
      .where(
        and(
          inArray(chatChannelMembers.channelId, channelIds),
          eq(chatChannelMembers.tenantId, tenantId),
        ),
      );

    const membersByChannel = new Map<string, ChannelMemberDto[]>();
    for (const m of memberRows) {
      const list = membersByChannel.get(m.channelId) ?? [];
      list.push({
        userId: m.userId,
        name: m.name ?? null,
        email: m.email ?? null,
        role: m.role as ChatMemberRole,
        lastReadAt: m.lastReadAt ? new Date(m.lastReadAt).toISOString() : null,
        muted: m.muted,
        joinedAt: new Date(m.joinedAt).toISOString(),
      });
      membersByChannel.set(m.channelId, list);
    }

    const unreadCounts = await this.computeUnread(tenantId, user.id, channelIds);

    return channels.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      type: c.type as ChatChannelType,
      title: c.title,
      salonId: c.salonId,
      createdBy: c.createdBy,
      lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : null,
      archivedAt: c.archivedAt ? new Date(c.archivedAt).toISOString() : null,
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
      members: membersByChannel.get(c.id) ?? [],
      unreadCount: unreadCounts.get(c.id) ?? 0,
    }));
  }

  async createChannel(
    user: AuthenticatedUser,
    dto: CreateChannelDto,
  ): Promise<ChannelResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();

    if (dto.type === 'dm') {
      if (dto.title) {
        throw new BadRequestException({ code: 'DM_TITLE_FORBIDDEN' });
      }
      if (dto.memberIds.length !== 1 || dto.memberIds[0] === user.id) {
        throw new BadRequestException({
          code: 'DM_REQUIRES_ONE_OTHER_MEMBER',
        });
      }
    } else {
      if (!dto.title) {
        throw new BadRequestException({ code: 'GROUP_TITLE_REQUIRED' });
      }
    }

    // Verify all memberIds (включая caller) — staff в этом тенанте, active.
    const allMemberIds = Array.from(new Set([user.id, ...dto.memberIds]));
    const staff = await this.db
      .select({ userId: tenantUsers.userId, role: tenantUsers.role })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          inArray(tenantUsers.userId, allMemberIds),
          eq(tenantUsers.status, 'active'),
          inArray(tenantUsers.role, [...STAFF_ROLES]),
        ),
      );
    if (staff.length !== allMemberIds.length) {
      throw new BadRequestException({
        code: 'CHANNEL_MEMBERS_INVALID',
        message: 'Все участники должны быть активными сотрудниками тенанта.',
      });
    }

    if (dto.type === 'dm') {
      const dmKey = this.dmKey(user.id, dto.memberIds[0]);
      const [existing] = await this.db
        .select({ id: chatChannels.id })
        .from(chatChannels)
        .where(and(eq(chatChannels.tenantId, tenantId), eq(chatChannels.dmKey, dmKey)))
        .limit(1);
      if (existing) {
        return this.getChannelForUser(user, existing.id);
      }

      const newId = await this.db.transaction(async (tx) => {
        const [ch] = await tx
          .insert(chatChannels)
          .values({
            tenantId,
            type: 'dm',
            title: null,
            salonId: null,
            dmKey,
            createdBy: user.id,
          })
          .returning({ id: chatChannels.id });

        await tx.insert(chatChannelMembers).values([
          { channelId: ch.id, tenantId, userId: user.id, role: 'admin' },
          { channelId: ch.id, tenantId, userId: dto.memberIds[0], role: 'member' },
        ]);

        return ch.id;
      });

      const response = await this.getChannelForUser(user, newId);
      await this.events.publish(tenantId, newId, 'channel.created', response);
      return response;
    }

    // Group
    const newId = await this.db.transaction(async (tx) => {
      const [ch] = await tx
        .insert(chatChannels)
        .values({
          tenantId,
          type: 'group',
          title: dto.title!,
          salonId: dto.salonId ?? null,
          dmKey: null,
          createdBy: user.id,
        })
        .returning({ id: chatChannels.id });

      const memberRows = [
        { channelId: ch.id, tenantId, userId: user.id, role: 'admin' as const },
        ...dto.memberIds
          .filter((id) => id !== user.id)
          .map((id) => ({
            channelId: ch.id,
            tenantId,
            userId: id,
            role: 'member' as const,
          })),
      ];
      await tx.insert(chatChannelMembers).values(memberRows);

      return ch.id;
    });

    const response = await this.getChannelForUser(user, newId);
    await this.events.publish(tenantId, newId, 'channel.created', response);
    return response;
  }

  /**
   * Единый «общий чат сотрудников» тенанта. Если ещё нет — создаёт group-канал
   * (маркер dmKey=__general__) и включает в него ВСЕХ активных сотрудников.
   * Если есть — досоединяет недостающих (новые сотрудники / сам caller) и
   * возвращает канал. Идемпотентно. Чат не нужно создавать вручную — это общий
   * свободный канал для персонала.
   */
  async getOrCreateGeneral(user: AuthenticatedUser): Promise<ChannelResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();

    const staff = await this.db
      .select({ userId: tenantUsers.userId })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.status, 'active'),
          inArray(tenantUsers.role, [...STAFF_ROLES]),
        ),
      );
    const staffIds = Array.from(new Set([user.id, ...staff.map((s) => s.userId)]));

    const [existing] = await this.db
      .select({ id: chatChannels.id })
      .from(chatChannels)
      .where(
        and(
          eq(chatChannels.tenantId, tenantId),
          eq(chatChannels.type, 'group'),
          eq(chatChannels.dmKey, GENERAL_DM_KEY),
          isNull(chatChannels.archivedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      const newId = await this.db.transaction(async (tx) => {
        const [ch] = await tx
          .insert(chatChannels)
          .values({
            tenantId,
            type: 'group',
            title: GENERAL_TITLE,
            salonId: null,
            dmKey: GENERAL_DM_KEY,
            createdBy: user.id,
          })
          .returning({ id: chatChannels.id });
        await tx.insert(chatChannelMembers).values(
          staffIds.map((id) => ({
            channelId: ch.id,
            tenantId,
            userId: id,
            role: (id === user.id ? 'admin' : 'member') as ChatMemberRole,
          })),
        );
        return ch.id;
      });
      const resp = await this.getChannelForUser(user, newId);
      await this.events.publish(tenantId, newId, 'channel.created', resp);
      return resp;
    }

    // Досоединяем недостающих активных сотрудников (включая нового caller).
    const members = await this.db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.channelId, existing.id));
    const have = new Set(members.map((m) => m.userId));
    const missing = staffIds.filter((id) => !have.has(id));
    if (missing.length > 0) {
      await this.db
        .insert(chatChannelMembers)
        .values(
          missing.map((id) => ({
            channelId: existing.id,
            tenantId,
            userId: id,
            role: 'member' as ChatMemberRole,
          })),
        )
        .onConflictDoNothing();
    }

    return this.getChannelForUser(user, existing.id);
  }

  async updateChannel(
    user: AuthenticatedUser,
    channelId: string,
    dto: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();
    await this.assertChannelAdmin(tenantId, channelId, user.id);

    const [existing] = await this.db
      .select()
      .from(chatChannels)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)))
      .limit(1);
    if (!existing) {
      throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND' });
    }

    const patch: Record<string, unknown> = { updatedAt: sql`now()` };
    if (dto.title !== undefined) {
      if (existing.type === 'dm') {
        throw new BadRequestException({ code: 'DM_TITLE_FORBIDDEN' });
      }
      patch.title = dto.title;
    }
    if (dto.archived !== undefined) {
      patch.archivedAt = dto.archived ? sql`now()` : null;
    }

    await this.db
      .update(chatChannels)
      .set(patch)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)));

    const response = await this.getChannelForUser(user, channelId);
    await this.events.publish(tenantId, channelId, 'channel.updated', response);
    return response;
  }

  async addMember(
    user: AuthenticatedUser,
    channelId: string,
    dto: AddMemberDto,
  ): Promise<ChannelResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();
    await this.assertChannelAdmin(tenantId, channelId, user.id);

    const [ch] = await this.db
      .select({ type: chatChannels.type })
      .from(chatChannels)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)))
      .limit(1);
    if (!ch) throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND' });
    if (ch.type === 'dm') {
      throw new BadRequestException({ code: 'DM_MEMBERSHIP_LOCKED' });
    }

    const [staff] = await this.db
      .select({ userId: tenantUsers.userId })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, dto.userId),
          eq(tenantUsers.status, 'active'),
          inArray(tenantUsers.role, [...STAFF_ROLES]),
        ),
      )
      .limit(1);
    if (!staff) {
      throw new BadRequestException({ code: 'MEMBER_NOT_STAFF' });
    }

    try {
      await this.db.insert(chatChannelMembers).values({
        channelId,
        tenantId,
        userId: dto.userId,
        role: dto.role ?? 'member',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('unique')) {
        throw new ConflictException({ code: 'ALREADY_MEMBER' });
      }
      throw err;
    }

    const response = await this.getChannelForUser(user, channelId);
    await this.events.publish(tenantId, channelId, 'channel.member.added', {
      channelId,
      userId: dto.userId,
      role: dto.role ?? 'member',
    });
    return response;
  }

  async removeMember(
    user: AuthenticatedUser,
    channelId: string,
    targetUserId: string,
  ): Promise<{ removed: true }> {
    const tenantId = this.tenantCtx.requireTenantId();

    // Self-leave allowed; admin может удалить кого угодно.
    if (targetUserId !== user.id) {
      await this.assertChannelAdmin(tenantId, channelId, user.id);
    }

    const [ch] = await this.db
      .select({ type: chatChannels.type, createdBy: chatChannels.createdBy })
      .from(chatChannels)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)))
      .limit(1);
    if (!ch) throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND' });
    if (ch.type === 'dm') {
      throw new BadRequestException({ code: 'DM_MEMBERSHIP_LOCKED' });
    }

    // Атомарно: если удаляемый — последний admin, повышаем самого старого
    // оставшегося member до admin. Инвариант после операции: либо канал пуст,
    // либо ≥1 admin. Без этого group мог остаться без управления.
    const result = await this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ role: chatChannelMembers.role })
        .from(chatChannelMembers)
        .where(
          and(
            eq(chatChannelMembers.channelId, channelId),
            eq(chatChannelMembers.userId, targetUserId),
            eq(chatChannelMembers.tenantId, tenantId),
          ),
        )
        .limit(1);
      if (!target) {
        return { deleted: false, promotedUserId: null as string | null };
      }

      let promotedUserId: string | null = null;

      if (target.role === 'admin') {
        const [otherAdmin] = await tx
          .select({ userId: chatChannelMembers.userId })
          .from(chatChannelMembers)
          .where(
            and(
              eq(chatChannelMembers.channelId, channelId),
              eq(chatChannelMembers.tenantId, tenantId),
              eq(chatChannelMembers.role, 'admin'),
              ne(chatChannelMembers.userId, targetUserId),
            ),
          )
          .limit(1);

        if (!otherAdmin) {
          const [successor] = await tx
            .select({ userId: chatChannelMembers.userId })
            .from(chatChannelMembers)
            .where(
              and(
                eq(chatChannelMembers.channelId, channelId),
                eq(chatChannelMembers.tenantId, tenantId),
                ne(chatChannelMembers.userId, targetUserId),
              ),
            )
            .orderBy(asc(chatChannelMembers.joinedAt))
            .limit(1);

          if (successor) {
            await tx
              .update(chatChannelMembers)
              .set({ role: 'admin' })
              .where(
                and(
                  eq(chatChannelMembers.channelId, channelId),
                  eq(chatChannelMembers.userId, successor.userId),
                  eq(chatChannelMembers.tenantId, tenantId),
                ),
              );
            promotedUserId = successor.userId;
          }
          // Нет преемника — канал станет пустым, это допустимо.
        }
      }

      const deleted = await tx
        .delete(chatChannelMembers)
        .where(
          and(
            eq(chatChannelMembers.channelId, channelId),
            eq(chatChannelMembers.userId, targetUserId),
            eq(chatChannelMembers.tenantId, tenantId),
          ),
        )
        .returning({ userId: chatChannelMembers.userId });

      return { deleted: deleted.length > 0, promotedUserId };
    });

    if (!result.deleted) {
      throw new NotFoundException({ code: 'MEMBER_NOT_FOUND' });
    }

    if (result.promotedUserId) {
      await this.events.publish(tenantId, channelId, 'channel.member.promoted', {
        channelId,
        userId: result.promotedUserId,
        role: 'admin',
        reason: 'last_admin_succession',
      });
    }

    await this.events.publish(tenantId, channelId, 'channel.member.removed', {
      channelId,
      userId: targetUserId,
    });
    return { removed: true };
  }

  async markRead(
    user: AuthenticatedUser,
    channelId: string,
  ): Promise<{ lastReadAt: string }> {
    const tenantId = this.tenantCtx.requireTenantId();
    const now = new Date();

    const updated = await this.db
      .update(chatChannelMembers)
      .set({ lastReadAt: now })
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.userId, user.id),
          eq(chatChannelMembers.tenantId, tenantId),
        ),
      )
      .returning({ lastReadAt: chatChannelMembers.lastReadAt });

    if (updated.length === 0) {
      throw new ForbiddenException({ code: 'CHANNEL_MEMBER_REQUIRED' });
    }

    await this.events.publish(tenantId, channelId, 'member.read', {
      channelId,
      userId: user.id,
      lastReadAt: now.toISOString(),
    });
    return { lastReadAt: now.toISOString() };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async getChannelForUser(
    user: AuthenticatedUser,
    channelId: string,
  ): Promise<ChannelResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();
    const [ch] = await this.db
      .select()
      .from(chatChannels)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)))
      .limit(1);
    if (!ch) throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND' });

    const memberRows = await this.db
      .select({
        userId: chatChannelMembers.userId,
        role: chatChannelMembers.role,
        lastReadAt: chatChannelMembers.lastReadAt,
        muted: chatChannelMembers.muted,
        joinedAt: chatChannelMembers.joinedAt,
        name: users.name,
        email: users.email,
      })
      .from(chatChannelMembers)
      .leftJoin(users, eq(users.id, chatChannelMembers.userId))
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.tenantId, tenantId),
        ),
      )
      .orderBy(asc(chatChannelMembers.joinedAt));

    const unread = await this.computeUnread(tenantId, user.id, [channelId]);

    return {
      id: ch.id,
      tenantId: ch.tenantId,
      type: ch.type as ChatChannelType,
      title: ch.title,
      salonId: ch.salonId,
      createdBy: ch.createdBy,
      lastMessageAt: ch.lastMessageAt ? new Date(ch.lastMessageAt).toISOString() : null,
      archivedAt: ch.archivedAt ? new Date(ch.archivedAt).toISOString() : null,
      createdAt: new Date(ch.createdAt).toISOString(),
      updatedAt: new Date(ch.updatedAt).toISOString(),
      members: memberRows.map((m) => ({
        userId: m.userId,
        name: m.name ?? null,
        email: m.email ?? null,
        role: m.role as ChatMemberRole,
        lastReadAt: m.lastReadAt ? new Date(m.lastReadAt).toISOString() : null,
        muted: m.muted,
        joinedAt: new Date(m.joinedAt).toISOString(),
      })),
      unreadCount: unread.get(channelId) ?? 0,
    };
  }

  private async assertChannelAdmin(
    tenantId: string,
    channelId: string,
    userId: string,
  ): Promise<void> {
    const [member] = await this.db
      .select({ role: chatChannelMembers.role })
      .from(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.userId, userId),
          eq(chatChannelMembers.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!member) {
      throw new ForbiddenException({ code: 'CHANNEL_MEMBER_REQUIRED' });
    }
    if (member.role !== 'admin') {
      throw new ForbiddenException({ code: 'CHANNEL_ADMIN_REQUIRED' });
    }
  }

  private async computeUnread(
    tenantId: string,
    userId: string,
    channelIds: string[],
  ): Promise<Map<string, number>> {
    if (channelIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        channelId: chatMessages.channelId,
        count: sql<number>`count(*)::int`,
      })
      .from(chatMessages)
      .innerJoin(
        chatChannelMembers,
        and(
          eq(chatChannelMembers.channelId, chatMessages.channelId),
          eq(chatChannelMembers.userId, userId),
        ),
      )
      .where(
        and(
          eq(chatMessages.tenantId, tenantId),
          inArray(chatMessages.channelId, channelIds),
          ne(chatMessages.authorUserId, userId),
          isNull(chatMessages.deletedAt),
          sql`(${chatChannelMembers.lastReadAt} is null OR ${chatMessages.createdAt} > ${chatChannelMembers.lastReadAt})`,
        ),
      )
      .groupBy(chatMessages.channelId);

    const result = new Map<string, number>();
    for (const r of rows) result.set(r.channelId, Number(r.count));
    return result;
  }

  private dmKey(a: string, b: string): string {
    return [a, b].sort().join(':');
  }
}

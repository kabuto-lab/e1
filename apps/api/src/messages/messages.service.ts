import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { conversations, conversationParticipants, messages, users, modelProfiles } from '@escort/db';

@Injectable()
export class MessagesService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  /**
   * Менеджер на проверке (status=pending_verification) или модель без верификации
   * анкеты (model_profiles.verification_status != verified) может писать только
   * админу — до одобрения/верификации не должен связываться с другими напрямую.
   */
  private async isRestrictedToAdminOnly(userId: string): Promise<boolean> {
    const [user] = await this.db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;

    if (user.role === 'manager') {
      return user.status === 'pending_verification';
    }

    if (user.role === 'model') {
      const [profile] = await this.db
        .select({ verificationStatus: modelProfiles.verificationStatus })
        .from(modelProfiles)
        .where(eq(modelProfiles.userId, userId))
        .limit(1);
      return !!profile && profile.verificationStatus !== 'verified';
    }

    return false;
  }

  private async assertCanMessage(userAId: string, userBId: string): Promise<void> {
    if (await this.isRestrictedToAdminOnly(userAId)) {
      const [target] = await this.db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userBId))
        .limit(1);

      if (target?.role !== 'admin') {
        throw new ForbiddenException('До одобрения/верификации доступен диалог только с администратором');
      }
    }
  }

  /** Найти или создать диалог между двумя пользователями */
  async findOrCreateConversation(userAId: string, userBId: string): Promise<string> {
    await this.assertCanMessage(userAId, userBId);

    // Ищем общий conversation для двух участников
    const existing = await this.db.execute(sql`
      SELECT cp1.conversation_id
      FROM conversation_participants cp1
      JOIN conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = ${userAId}
        AND cp2.user_id = ${userBId}
      LIMIT 1
    `);

    if (existing.rows?.length > 0) {
      return existing.rows[0].conversation_id as string;
    }

    const [conv] = await this.db
      .insert(conversations)
      .values({})
      .returning({ id: conversations.id });

    await this.db.insert(conversationParticipants).values([
      { conversationId: conv.id, userId: userAId },
      { conversationId: conv.id, userId: userBId },
    ]);

    return conv.id;
  }

  /** Список диалогов пользователя с последним сообщением */
  async getConversations(userId: string) {
    const participantRows = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (participantRows.length === 0) return [];

    const convIds = participantRows.map((r: any) => r.conversationId);

    // Все участники этих диалогов
    const participants = await this.db
      .select({
        conversationId: conversationParticipants.conversationId,
        userId: conversationParticipants.userId,
        lastReadAt: conversationParticipants.lastReadAt,
        fullName: users.fullName,
        login: users.login,
        email: users.email,
        telegramUsername: users.telegramUsername,
        role: users.role,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(inArray(conversationParticipants.conversationId, convIds));

    // Последнее сообщение каждого диалога — inArray избегает cast-проблемы postgres драйвера
    const allMsgs = await this.db
      .select({
        conversationId: messages.conversationId,
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .orderBy(desc(messages.createdAt));

    // Берём первое (самое свежее) на каждый диалог
    const lastMsgMap = new Map<string, any>();
    for (const row of allMsgs) {
      if (!lastMsgMap.has(row.conversationId)) {
        lastMsgMap.set(row.conversationId, {
          conversation_id: row.conversationId,
          id: row.id,
          content: row.content,
          sender_id: row.senderId,
          created_at: row.createdAt,
        });
      }
    }

    // Группируем участников по диалогу
    const partMap = new Map<string, any[]>();
    for (const p of participants) {
      if (!partMap.has(p.conversationId)) partMap.set(p.conversationId, []);
      partMap.get(p.conversationId)!.push(p);
    }

    return convIds.map((cid: string) => {
      const parts = partMap.get(cid) ?? [];
      const interlocutor = parts.find((p: any) => p.userId !== userId);
      const myPart = parts.find((p: any) => p.userId === userId);
      const lastMsg = lastMsgMap.get(cid);

      return {
        conversationId: cid,
        interlocutor: interlocutor
          ? {
              userId: interlocutor.userId,
              fullName: interlocutor.fullName ?? null,
              login: interlocutor.login ?? null,
              email: interlocutor.email ?? null,
              telegramUsername: interlocutor.telegramUsername ?? null,
              role: interlocutor.role,
            }
          : null,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              senderId: lastMsg.sender_id,
              createdAt: lastMsg.created_at,
            }
          : null,
        lastReadAt: myPart?.lastReadAt ?? null,
        unread: lastMsg && myPart?.lastReadAt
          ? new Date(lastMsg.created_at) > new Date(myPart.lastReadAt)
          : !!lastMsg,
      };
    }).sort((a: any, b: any) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  /** История сообщений диалога */
  async getMessages(conversationId: string, userId: string, limit = 50, before?: string) {
    await this.assertParticipant(conversationId, userId);

    let query = this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderName: users.fullName,
        senderLogin: users.login,
        senderRole: users.role,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    const rows = await query;
    return rows.reverse();
  }

  /** Сохранить новое сообщение */
  async saveMessage(conversationId: string, senderId: string, content: string) {
    await this.assertParticipant(conversationId, senderId);

    const [msg] = await this.db
      .insert(messages)
      .values({ conversationId, senderId, content })
      .returning();

    // Обновить updatedAt у диалога
    await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return msg;
  }

  /** Отметить прочитанным */
  async markRead(conversationId: string, userId: string) {
    await this.db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      );
  }

  /** Получить список пользователей для начала диалога */
  async getUsers(currentUserId: string) {
    const restricted = await this.isRestrictedToAdminOnly(currentUserId);

    const rows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        login: users.login,
        email: users.email,
        telegramUsername: users.telegramUsername,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          sql`${users.id} != ${currentUserId}`,
          sql`${users.deletedAt} IS NULL`,
          restricted ? eq(users.role, 'admin') : sql`true`,
        ),
      )
      .limit(100);
    return rows;
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new ForbiddenException('Not a participant of this conversation');
    }
  }
}

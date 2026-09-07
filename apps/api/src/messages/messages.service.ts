import { Injectable, Inject, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { eq, and, ne, inArray, desc, sql } from 'drizzle-orm';
import { conversations, conversationParticipants, messages, users, modelProfiles, employeeProfiles } from '@escort/db';
import { AntiLeakService } from '../communications/anti-leak.service';

@Injectable()
export class MessagesService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly antiLeakService: AntiLeakService,
  ) {}

  /**
   * Менеджер на проверке (status=pending_verification) или модель без верификации
   * анкеты (model_profiles.verification_status != verified) может писать только
   * админу (и, для модели, своему привязанному менеджеру — ей нужно с ним
   * связаться, пока анкета на проверке) — до одобрения/верификации не должен
   * связываться с другими напрямую.
   */
  private async getMessagingRestriction(
    userId: string,
  ): Promise<{ restricted: boolean; allowedManagerId: string | null }> {
    const [user] = await this.db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return { restricted: false, allowedManagerId: null };

    if (user.role === 'manager') {
      return { restricted: user.status === 'pending_verification', allowedManagerId: null };
    }

    if (user.role === 'model') {
      const [profile] = await this.db
        .select({ verificationStatus: modelProfiles.verificationStatus, managerId: modelProfiles.managerId })
        .from(modelProfiles)
        .where(eq(modelProfiles.userId, userId))
        .limit(1);
      const restricted = !!profile && profile.verificationStatus !== 'verified';
      return { restricted, allowedManagerId: restricted ? (profile?.managerId ?? null) : null };
    }

    return { restricted: false, allowedManagerId: null };
  }

  private async assertCanMessage(userAId: string, userBId: string): Promise<void> {
    const { restricted, allowedManagerId } = await this.getMessagingRestriction(userAId);
    if (!restricted) return;
    if (allowedManagerId && userBId === allowedManagerId) return;

    const [target] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userBId))
      .limit(1);

    if (target?.role !== 'admin') {
      throw new ForbiddenException('До одобрения/верификации доступен диалог только с администратором и вашим менеджером');
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

    if (existing.length > 0) {
      return existing[0].conversation_id as string;
    }

    // Если один из собеседников — аккаунт модели, диалог привязывается к её анкете:
    // через conversations.modelId менеджер и сотрудники модели видят его в общем
    // инбоксе, не будучи формальными участниками (см. canAccessAsTeam).
    const [modelA] = await this.db
      .select({ id: modelProfiles.id })
      .from(modelProfiles)
      .where(eq(modelProfiles.userId, userAId))
      .limit(1);
    const [modelB] = await this.db
      .select({ id: modelProfiles.id })
      .from(modelProfiles)
      .where(eq(modelProfiles.userId, userBId))
      .limit(1);
    const modelId = modelA?.id ?? modelB?.id ?? null;

    const [conv] = await this.db
      .insert(conversations)
      .values({ modelId })
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

    // Все участники этих диалогов (+ главное фото анкеты, если участник — модель)
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
        avatarUrl: modelProfiles.mainPhotoUrl,
        modelSlug: modelProfiles.slug,
        modelDisplayName: modelProfiles.displayName,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .leftJoin(modelProfiles, eq(modelProfiles.userId, conversationParticipants.userId))
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

    return convIds
      .map((cid: string) => {
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
                avatarUrl: interlocutor.avatarUrl ?? null,
                modelSlug: interlocutor.modelSlug ?? null,
                modelDisplayName: interlocutor.modelDisplayName ?? null,
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
      })
      // Осиротевшие диалоги (второй участник физически удалён из системы, см.
      // UsersService.deleteUser) — без собеседника показывать нечего, это диалог-призрак.
      .filter((c: any) => c.interlocutor !== null)
      .sort((a: any, b: any) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  /** История сообщений диалога — участник, либо менеджер/сотрудник команды модели */
  async getMessages(conversationId: string, userId: string, role?: string, limit = 50, before?: string) {
    await this.assertCanAccess(conversationId, userId, role);

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

  /**
   * Сохранить новое сообщение. senderRole нужен AntiLeakService: client — блокирует
   * попытки слить контакты (BLOCK_AND_WARN), model — маскирует их и всё равно доставляет
   * (MASK_AND_LOG), manager/admin — без проверки. См. communications/anti-leak.service.ts.
   */
  async saveMessage(conversationId: string, senderId: string, senderRole: string, content: string) {
    await this.assertCanAccess(conversationId, senderId, senderRole);

    const scan = this.antiLeakService.sanitizeMessage(content, senderRole);
    if (!scan.allowed) {
      throw new BadRequestException(this.antiLeakService.getWarningMessage(scan.violations));
    }

    const [msg] = await this.db
      .insert(messages)
      .values({ conversationId, senderId, content: scan.sanitized })
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

  /**
   * Быстрые контакты для раздела «Сообщения»: администратор поддержки (кроме себя самого),
   * и — только для модели — её менеджер (если привязан и не заблокирован/приостановлен).
   */
  async getSupportContacts(userId: string): Promise<{ adminUserId: string | null; managerUserId: string | null }> {
    const [me] = await this.db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);

    const [admin] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.status, 'active'), ne(users.id, userId)))
      .orderBy(users.createdAt)
      .limit(1);

    let managerUserId: string | null = null;
    if (me?.role === 'model') {
      const [profile] = await this.db
        .select({ managerId: modelProfiles.managerId })
        .from(modelProfiles)
        .where(eq(modelProfiles.userId, userId))
        .limit(1);
      if (profile?.managerId) {
        const [manager] = await this.db
          .select({ id: users.id, status: users.status })
          .from(users)
          .where(eq(users.id, profile.managerId))
          .limit(1);
        if (manager && manager.status !== 'blacklisted' && manager.status !== 'suspended') {
          managerUserId = manager.id;
        }
      }
    }

    return { adminUserId: admin?.id ?? null, managerUserId };
  }

  /** Получить список пользователей для начала диалога */
  async getUsers(currentUserId: string) {
    const { restricted, allowedManagerId } = await this.getMessagingRestriction(currentUserId);

    const restrictionFilter = allowedManagerId
      ? sql`(${users.role} = 'admin' OR ${users.id} = ${allowedManagerId})`
      : eq(users.role, 'admin');

    const rows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        login: users.login,
        email: users.email,
        telegramUsername: users.telegramUsername,
        role: users.role,
        avatarUrl: modelProfiles.mainPhotoUrl,
        modelDisplayName: modelProfiles.displayName,
      })
      .from(users)
      .leftJoin(modelProfiles, eq(modelProfiles.userId, users.id))
      .where(
        and(
          sql`${users.id} != ${currentUserId}`,
          sql`${users.deletedAt} IS NULL`,
          restricted ? restrictionFilter : sql`true`,
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

  /** managerId, за которым закреплён вызывающий — сам менеджер (свой userId) или сотрудник (employee_profiles.managerId). Null — если ни то, ни другое. */
  private async getTeamManagerId(userId: string, role: string): Promise<string | null> {
    if (role === 'manager') return userId;
    if (role === 'employee') {
      const [row] = await this.db
        .select({ managerId: employeeProfiles.managerId })
        .from(employeeProfiles)
        .where(eq(employeeProfiles.userId, userId))
        .limit(1);
      return row?.managerId ?? null;
    }
    return null;
  }

  /** Диалог доступен менеджеру/сотруднику команды (не формальному участнику), если он привязан к анкете их менеджера. */
  private async canAccessAsTeam(conversationId: string, userId: string, role: string): Promise<boolean> {
    const teamManagerId = await this.getTeamManagerId(userId, role);
    if (!teamManagerId) return false;

    const [conv] = await this.db
      .select({ modelId: conversations.modelId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (!conv?.modelId) return false;

    const [model] = await this.db
      .select({ managerId: modelProfiles.managerId })
      .from(modelProfiles)
      .where(eq(modelProfiles.id, conv.modelId))
      .limit(1);
    return !!model?.managerId && model.managerId === teamManagerId;
  }

  /** Участник ИЛИ менеджер/сотрудник команды модели, о которой этот диалог — используется для чтения/отправки, не для удаления. */
  private async assertCanAccess(conversationId: string, userId: string, role?: string): Promise<void> {
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
    if (rows.length > 0) return;

    if (role && (await this.canAccessAsTeam(conversationId, userId, role))) return;

    throw new ForbiddenException('Not a participant of this conversation');
  }

  /**
   * Общий инбокс менеджера/сотрудника — все диалоги по анкетам их команды, включая те,
   * где они не формальные участники. Показывает, по какой анкете обращение, её статус
   * и кто из команды взял диалог в работу (claim, см. claimConversation).
   */
  async getTeamInbox(userId: string, role: string) {
    const teamManagerId = await this.getTeamManagerId(userId, role);
    if (!teamManagerId) return [];

    const models = await this.db
      .select({
        id: modelProfiles.id,
        displayName: modelProfiles.displayName,
        slug: modelProfiles.slug,
        mainPhotoUrl: modelProfiles.mainPhotoUrl,
        availabilityStatus: modelProfiles.availabilityStatus,
      })
      .from(modelProfiles)
      .where(eq(modelProfiles.managerId, teamManagerId));
    if (models.length === 0) return [];

    const modelIds = models.map((m: { id: string }) => m.id);
    const modelMap = new Map(models.map((m: any) => [m.id, m]));

    const convRows = await this.db
      .select({
        id: conversations.id,
        modelId: conversations.modelId,
        claimedBy: conversations.claimedBy,
        claimedAt: conversations.claimedAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(inArray(conversations.modelId, modelIds));
    if (convRows.length === 0) return [];

    const convIds = convRows.map((c: { id: string }) => c.id);

    const participants = await this.db
      .select({
        conversationId: conversationParticipants.conversationId,
        userId: conversationParticipants.userId,
        fullName: users.fullName,
        login: users.login,
        role: users.role,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(inArray(conversationParticipants.conversationId, convIds));

    const clientMap = new Map<string, any>();
    for (const p of participants) {
      if (p.role === 'client') clientMap.set(p.conversationId, p);
    }

    const allMsgs = await this.db
      .select({
        conversationId: messages.conversationId,
        content: messages.content,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .orderBy(desc(messages.createdAt));

    const lastMsgMap = new Map<string, any>();
    for (const m of allMsgs) {
      if (!lastMsgMap.has(m.conversationId)) lastMsgMap.set(m.conversationId, m);
    }

    const claimerIds = convRows
      .map((c: { claimedBy: string | null }) => c.claimedBy)
      .filter((id: string | null): id is string => !!id);
    const claimers = claimerIds.length > 0
      ? await this.db
          .select({ id: users.id, fullName: users.fullName, login: users.login })
          .from(users)
          .where(inArray(users.id, claimerIds))
      : [];
    const claimerMap = new Map(claimers.map((u: { id: string }) => [u.id, u]));

    return convRows
      .map((c: { id: string; modelId: string | null; claimedBy: string | null; claimedAt: Date | null }) => {
        const model: any = c.modelId ? modelMap.get(c.modelId) : null;
        const client = clientMap.get(c.id);
        const lastMsg = lastMsgMap.get(c.id);
        const claimer = c.claimedBy ? claimerMap.get(c.claimedBy) : null;
        return {
          conversationId: c.id,
          model: model
            ? {
                id: model.id,
                displayName: model.displayName,
                slug: model.slug,
                avatarUrl: model.mainPhotoUrl,
                availabilityStatus: model.availabilityStatus,
              }
            : null,
          client: client
            ? { userId: client.userId, fullName: client.fullName ?? null, login: client.login ?? null }
            : null,
          lastMessage: lastMsg
            ? { content: lastMsg.content, senderId: lastMsg.senderId, createdAt: lastMsg.createdAt }
            : null,
          claimedBy: claimer
            ? { userId: (claimer as any).id, fullName: (claimer as any).fullName ?? null, login: (claimer as any).login ?? null }
            : null,
          claimedAt: c.claimedAt,
        };
      })
      .filter((c: any) => c.client !== null)
      .sort((a: any, b: any) => {
        const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bt - at;
      });
  }

  /** Взять диалог в работу — 409, если уже занят другим сотрудником команды. */
  async claimConversation(conversationId: string, userId: string, role: string): Promise<void> {
    const hasAccess = await this.canAccessAsTeam(conversationId, userId, role);
    if (!hasAccess) {
      throw new ForbiddenException('Not your team\'s conversation');
    }

    const [conv] = await this.db
      .select({ claimedBy: conversations.claimedBy })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    if (conv.claimedBy && conv.claimedBy !== userId) {
      throw new ConflictException('Диалог уже в работе у другого сотрудника');
    }

    await this.db
      .update(conversations)
      .set({ claimedBy: userId, claimedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  /** Отпустить диалог — сотрудник только свой, менеджер может снять захват любого сотрудника команды. */
  async releaseConversation(conversationId: string, userId: string, role: string): Promise<void> {
    const hasAccess = await this.canAccessAsTeam(conversationId, userId, role);
    if (!hasAccess) {
      throw new ForbiddenException('Not your team\'s conversation');
    }

    const [conv] = await this.db
      .select({ claimedBy: conversations.claimedBy })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    if (conv.claimedBy && conv.claimedBy !== userId && role !== 'manager') {
      throw new ForbiddenException('Диалог занят другим сотрудником');
    }

    await this.db
      .update(conversations)
      .set({ claimedBy: null, claimedAt: null })
      .where(eq(conversations.id, conversationId));
  }

  /** Удалить диалог (только для участника) — каскадом сносит участников и сообщения. */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await this.assertParticipant(conversationId, userId);
    await this.db.delete(conversations).where(eq(conversations.id, conversationId));
  }
}

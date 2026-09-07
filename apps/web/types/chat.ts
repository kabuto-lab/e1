interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  senderName: string | null;
  senderLogin: string | null;
  senderRole: string;
}

interface MessagesConversation {
  conversationId: string;
  interlocutor: { userId: string; fullName: string | null; login: string | null; email: string | null; telegramUsername: string | null; role: string; avatarUrl: string | null; modelSlug: string | null; modelDisplayName: string | null } | null;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  lastReadAt: string | null;
  unread: boolean;
}

/** Общий инбокс менеджера/сотрудника — диалоги по анкетам их команды (см. MessagesService.getTeamInbox). */
interface TeamInboxItem {
  conversationId: string;
  model: {
    id: string;
    displayName: string;
    slug: string | null;
    avatarUrl: string | null;
    availabilityStatus: 'offline' | 'online' | 'in_shift' | 'busy';
  } | null;
  client: { userId: string; fullName: string | null; login: string | null } | null;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  claimedBy: { userId: string; fullName: string | null; login: string | null } | null;
  claimedAt: string | null;
}

export type { ChatMessage, MessagesConversation, TeamInboxItem };

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
  interlocutor: { userId: string; fullName: string | null; login: string | null; email: string | null; telegramUsername: string | null; role: string; avatarUrl: string | null; modelSlug: string | null } | null;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  lastReadAt: string | null;
  unread: boolean;
}

export type { ChatMessage, MessagesConversation };

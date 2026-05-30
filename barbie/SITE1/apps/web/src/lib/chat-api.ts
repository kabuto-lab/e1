'use client';

import { apiFetch } from './api-client';
import { getAuth } from './auth';

export interface ChannelMember {
  userId: string;
  name: string | null;
  email: string | null;
  role: 'member' | 'admin';
  lastReadAt: string | null;
  muted: boolean;
  joinedAt: string;
}

export interface Channel {
  id: string;
  tenantId: string;
  type: 'dm' | 'group';
  title: string | null;
  salonId: string | null;
  createdBy: string;
  lastMessageAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: ChannelMember[];
  unreadCount: number;
}

export interface MessageAttachment {
  mediaKey: string;
  mime: string;
  size: number;
  name: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorUserId: string;
  body: string;
  attachments: MessageAttachment[];
  replyToMessageId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface CreateChannelInput {
  type: 'dm' | 'group';
  title?: string;
  salonId?: string;
  memberIds: string[];
}

export const chatApi = {
  listChannels: () => apiFetch<Channel[]>('/v1/chat/channels'),
  getChannel: (id: string) => apiFetch<Channel>(`/v1/chat/channels/${id}`),
  createChannel: (input: CreateChannelInput) =>
    apiFetch<Channel>('/v1/chat/channels', { method: 'POST', body: input }),
  updateChannel: (id: string, patch: { title?: string; archived?: boolean }) =>
    apiFetch<Channel>(`/v1/chat/channels/${id}`, { method: 'PATCH', body: patch }),
  addMember: (channelId: string, userId: string, role?: 'member' | 'admin') =>
    apiFetch<Channel>(`/v1/chat/channels/${channelId}/members`, {
      method: 'POST',
      body: { userId, role },
    }),
  removeMember: (channelId: string, userId: string) =>
    apiFetch<{ removed: true }>(`/v1/chat/channels/${channelId}/members/${userId}`, {
      method: 'DELETE',
    }),
  markRead: (channelId: string) =>
    apiFetch<{ lastReadAt: string }>(`/v1/chat/channels/${channelId}/read`, {
      method: 'POST',
    }),

  listMessages: (channelId: string, before?: string, limit = 50) => {
    const qs = new URLSearchParams();
    if (before) qs.set('before', before);
    qs.set('limit', String(limit));
    return apiFetch<Message[]>(
      `/v1/chat/channels/${channelId}/messages?${qs.toString()}`,
    );
  },
  sendMessage: (
    channelId: string,
    body: string,
    options?: { attachments?: MessageAttachment[]; replyToMessageId?: string },
  ) =>
    apiFetch<Message>(`/v1/chat/channels/${channelId}/messages`, {
      method: 'POST',
      body: {
        body,
        attachments: options?.attachments,
        replyToMessageId: options?.replyToMessageId,
      },
    }),
  editMessage: (messageId: string, body: string) =>
    apiFetch<Message>(`/v1/chat/messages/${messageId}`, {
      method: 'PATCH',
      body: { body },
    }),
  deleteMessage: (messageId: string) =>
    apiFetch<{ deleted: true }>(`/v1/chat/messages/${messageId}`, {
      method: 'DELETE',
    }),
};

export interface ChatStreamEvent {
  id: string;
  tenantId: string;
  channelId: string;
  type:
    | 'message.created'
    | 'message.edited'
    | 'message.deleted'
    | 'member.read'
    | 'channel.created'
    | 'channel.updated'
    | 'channel.member.added'
    | 'channel.member.removed';
  payload: unknown;
  createdAt: string;
}

/**
 * Декодирует `sub` (user id) из текущего accessToken JWT.
 * Без зависимостей — base64url → JSON → sub. Возвращает null если токен
 * отсутствует или сломан (не валидирует подпись — этим занимается сервер).
 */
export function getCurrentUserId(): string | null {
  const auth = getAuth();
  const token = auth?.accessToken;
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'),
    ) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    // Browser doesn't have Buffer — use atob fallback.
    try {
      const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(decoded) as { sub?: string };
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * Сборка URL SSE-стрима. EventSource не поддерживает кастомные заголовки —
 * accessToken идёт в query.
 */
export function buildStreamUrl(since?: string): string {
  const auth = getAuth();
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5110';
  const qs = new URLSearchParams();
  if (auth?.accessToken) qs.set('token', auth.accessToken);
  if (since) qs.set('since', since);
  // X-Tenant-Slug в headers тут не передаётся — на сервере middleware читает
  // тенант из subdomain. В dev можно использовать query-параметр на стороне
  // middleware (TODO Phase 1).
  if (auth?.tenantSlug) qs.set('tenant', auth.tenantSlug);
  return `${base}/v1/chat/stream?${qs.toString()}`;
}

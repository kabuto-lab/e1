'use client';

import { useCallback, useEffect, useState } from 'react';
import { chatApi, getCurrentUserId, type Channel, type Message } from '@/lib/chat-api';
import { useChatStream } from './useChatStream';

/**
 * useChatState — состояние единого «общего чата сотрудников». Канал не создаётся
 * вручную: бэкенд лениво отдаёт/создаёт общий group-канал тенанта и включает в
 * него всех сотрудников. Один SSE-стрим на сессию питает и бейдж непрочитанного
 * в рейле, и докнутую панель.
 *
 * История сообщений persistent — грузится в MessageThread (listMessages).
 *
 * `enabled` — гейт (auth, не login). `active` — панель открыта (виден чат): тогда
 * новые сообщения не копят unread и помечаются прочитанными.
 */
export interface ChatState {
  channel: Channel | null;
  liveMessages: Message[];
  loading: boolean;
  error: string | null;
  currentUserId: string;
  unread: number;
  handleSend: (body: string) => Promise<void>;
  onMessageMutated: (m: Message) => void;
  reload: () => Promise<void>;
}

export function useChatState(enabled: boolean, active: boolean): ChatState {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Через эффект (а не useMemo) — гарантированно клиентское значение после
  // маунта; иначе SSR-«''» мог кэшироваться и ломать гейт «только сотрудникам».
  const [currentUserId, setCurrentUserId] = useState('');
  useEffect(() => {
    setCurrentUserId(getCurrentUserId() ?? '');
  }, []);

  const unread = channel?.unreadCount ?? 0;
  const channelId = channel?.id;

  const reload = useCallback(async () => {
    setError(null);
    try {
      const ch = await chatApi.getGeneral();
      setChannel(ch);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  // Панель открыта → помечаем прочитанным и гасим бейдж.
  useEffect(() => {
    if (!enabled || !active || !channelId) return;
    chatApi.markRead(channelId).catch(() => undefined);
    setChannel((c) => (c ? { ...c, unreadCount: 0 } : c));
  }, [enabled, active, channelId]);

  useChatStream(
    useCallback(
      (ev) => {
        switch (ev.type) {
          case 'message.created': {
            const msg = ev.payload as Message;
            if (msg.channelId !== channelId) break;
            setLiveMessages((prev) => [...prev, msg]);
            if (active) {
              chatApi.markRead(channelId).catch(() => undefined);
            } else if (msg.authorUserId !== currentUserId) {
              setChannel((c) =>
                c && c.id === channelId
                  ? { ...c, unreadCount: c.unreadCount + 1, lastMessageAt: msg.createdAt }
                  : c,
              );
            }
            break;
          }
          case 'message.edited': {
            const upd = ev.payload as { id: string; body: string; editedAt: string };
            setLiveMessages((prev) =>
              prev.map((m) => (m.id === upd.id ? { ...m, body: upd.body, editedAt: upd.editedAt } : m)),
            );
            break;
          }
          case 'message.deleted': {
            const del = ev.payload as { id: string };
            setLiveMessages((prev) =>
              prev.map((m) =>
                m.id === del.id ? { ...m, deletedAt: new Date().toISOString(), body: '' } : m,
              ),
            );
            break;
          }
          case 'channel.updated':
          case 'channel.member.added':
          case 'channel.member.removed':
            void reload();
            break;
          case 'member.read': {
            const rd = ev.payload as { channelId: string; userId: string };
            if (rd.userId === currentUserId && rd.channelId === channelId) {
              setChannel((c) => (c ? { ...c, unreadCount: 0 } : c));
            }
            break;
          }
        }
      },
      [channelId, active, currentUserId, reload],
    ),
    enabled,
  );

  const handleSend = useCallback(
    async (body: string) => {
      if (!channelId) return;
      // Оптимистично добавляем своё сообщение из ответа (мгновенно), не дожидаясь
      // SSE-эха. Дубль от SSE отсеётся по id (mergeMessages + проверка ниже).
      const msg = await chatApi.sendMessage(channelId, body);
      setLiveMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    },
    [channelId],
  );

  const onMessageMutated = useCallback((m: Message) => {
    setLiveMessages((prev) => prev.map((p) => (p.id === m.id ? m : p)));
  }, []);

  return {
    channel,
    liveMessages,
    loading,
    error,
    currentUserId,
    unread,
    handleSend,
    onMessageMutated,
    reload,
  };
}

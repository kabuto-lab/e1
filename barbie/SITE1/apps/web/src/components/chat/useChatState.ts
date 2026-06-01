'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { chatApi, getCurrentUserId, type Channel, type Message } from '@/lib/chat-api';
import { useChatStream } from './useChatStream';

/**
 * useChatState — единый источник состояния чата (каналы, выбранный канал,
 * live-сообщения, непрочитанное) с ОДНИМ SSE-стримом. Используется и бейджем
 * непрочитанного в рейле, и докнутой панелью ChatDock — поэтому подключение
 * одно на сессию админки (а не по одному на каждый компонент).
 *
 * `enabled` — гейт: на /admin/login и без auth хук не фетчит каналы и не
 * открывает стрим.
 */
export interface ChatState {
  channels: Channel[];
  selected: Channel | null;
  selectedId: string | null;
  liveMessages: Message[];
  showNew: boolean;
  loading: boolean;
  error: string | null;
  currentUserId: string;
  unreadTotal: number;
  setShowNew: (v: boolean) => void;
  selectChannel: (id: string | null) => void;
  reloadChannels: () => Promise<void>;
  handleSend: (body: string) => Promise<void>;
  onMessageMutated: (m: Message) => void;
  onChannelCreated: (ch: Channel) => void;
}

export function useChatState(enabled: boolean): ChatState {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = useMemo(
    () => (typeof window !== 'undefined' ? getCurrentUserId() ?? '' : ''),
    [],
  );

  const selected = useMemo(
    () => channels.find((c) => c.id === selectedId) ?? null,
    [channels, selectedId],
  );

  const unreadTotal = useMemo(
    () => channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [channels],
  );

  const reloadChannels = useCallback(async () => {
    setError(null);
    try {
      const list = await chatApi.listChannels();
      setChannels(list);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reloadChannels();
  }, [enabled, reloadChannels]);

  useChatStream(
    useCallback(
      (ev) => {
        switch (ev.type) {
          case 'message.created': {
            const msg = ev.payload as Message;
            setLiveMessages((prev) => [...prev, msg]);
            setChannels((prev) =>
              prev.map((c) =>
                c.id === ev.channelId
                  ? {
                      ...c,
                      lastMessageAt: msg.createdAt,
                      unreadCount:
                        c.id === selectedId || msg.authorUserId === currentUserId
                          ? c.unreadCount
                          : c.unreadCount + 1,
                    }
                  : c,
              ),
            );
            if (ev.channelId === selectedId) {
              chatApi.markRead(ev.channelId).catch(() => undefined);
            }
            break;
          }
          case 'message.edited': {
            const upd = ev.payload as { id: string; channelId: string; body: string; editedAt: string };
            setLiveMessages((prev) =>
              prev.map((m) => (m.id === upd.id ? { ...m, body: upd.body, editedAt: upd.editedAt } : m)),
            );
            break;
          }
          case 'message.deleted': {
            const del = ev.payload as { id: string; channelId: string };
            setLiveMessages((prev) =>
              prev.map((m) =>
                m.id === del.id ? { ...m, deletedAt: new Date().toISOString(), body: '' } : m,
              ),
            );
            break;
          }
          case 'channel.created':
          case 'channel.updated':
          case 'channel.member.added':
          case 'channel.member.removed':
            void reloadChannels();
            break;
          case 'member.read': {
            const rd = ev.payload as { channelId: string; userId: string; lastReadAt: string };
            if (rd.userId === currentUserId) {
              setChannels((prev) =>
                prev.map((c) => (c.id === rd.channelId ? { ...c, unreadCount: 0 } : c)),
              );
            }
            break;
          }
        }
      },
      [selectedId, currentUserId, reloadChannels],
    ),
    enabled,
  );

  const selectChannel = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setLiveMessages((prev) => prev.filter((m) => m.channelId === id));
      chatApi.markRead(id).catch(() => undefined);
      // Оптимистично гасим unread выбранного канала.
      setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    }
  }, []);

  const handleSend = useCallback(
    async (body: string) => {
      if (!selectedId) return;
      await chatApi.sendMessage(selectedId, body);
    },
    [selectedId],
  );

  const onMessageMutated = useCallback((m: Message) => {
    setLiveMessages((prev) => prev.map((p) => (p.id === m.id ? m : p)));
  }, []);

  const onChannelCreated = useCallback((ch: Channel) => {
    setShowNew(false);
    setChannels((prev) => [ch, ...prev.filter((c) => c.id !== ch.id)]);
    setSelectedId(ch.id);
    setLiveMessages([]);
  }, []);

  return {
    channels,
    selected,
    selectedId,
    liveMessages,
    showNew,
    loading,
    error,
    currentUserId,
    unreadTotal,
    setShowNew,
    selectChannel,
    reloadChannels,
    handleSend,
    onMessageMutated,
    onChannelCreated,
  };
}

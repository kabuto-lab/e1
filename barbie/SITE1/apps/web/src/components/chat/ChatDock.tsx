'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { chatApi, getCurrentUserId, type Channel, type Message } from '@/lib/chat-api';
import { useChatStream } from './useChatStream';
import { ChannelList } from './ChannelList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { NewChannelDialog } from './NewChannelDialog';

/**
 * ChatDock — докнутая панель чата во всю высоту экрана (1/6 ширины), которую
 * вызывает кнопка «Чат» в рейле. НЕ отдельная страница: AdminShell сжимает
 * контент дашборда, отдавая 3-ю grid-колонку под док.
 *
 * Компактный одноколоночный layout: список каналов ИЛИ открытый тред (с кнопкой
 * «‹ каналы»). Логика (SSE, unread, send) — та же, что на /admin/chat; вынос в
 * общий хук — отдельный рефактор (TODO), пока самодостаточно, чтобы не задеть
 * рабочую страницу.
 */
export function ChatDock({ onClose }: { onClose: () => void }) {
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
    reloadChannels();
  }, [reloadChannels]);

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
  );

  async function handleSend(body: string): Promise<void> {
    if (!selected) return;
    await chatApi.sendMessage(selected.id, body);
  }

  return (
    <aside className="sticky top-0 h-screen border-l border-line bg-bg-elev flex flex-col min-w-0 z-20">
      {/* header */}
      <div className="shrink-0 h-12 px-3 flex items-center gap-2 border-b border-line">
        {selected && (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="К каналам"
            className="text-text-mute hover:text-text shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <span className="text-[13px] font-semibold truncate flex-1">
          {selected ? renderChannelTitle(selected, currentUserId) : 'Чат'}
        </span>
        {!selected && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            aria-label="Новый канал"
            className="text-text-mute hover:text-gold shrink-0"
          >
            <Plus size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть чат"
          className="text-text-mute hover:text-text shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="m-2 px-2 py-1.5 border border-red-500/40 bg-red-500/10 text-red-300 text-[11px] rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-4 text-text-mute font-mono text-[11px]">loading…</div>
      ) : !currentUserId ? (
        <div className="p-4 text-text-mute text-[12px]">Чат доступен только сотрудникам.</div>
      ) : selected ? (
        <>
          <MessageThread
            channel={selected}
            currentUserId={currentUserId}
            liveMessages={liveMessages}
            onMessageMutated={(m) =>
              setLiveMessages((prev) => prev.map((p) => (p.id === m.id ? m : p)))
            }
          />
          <MessageInput onSend={handleSend} />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChannelList
            channels={channels}
            currentUserId={currentUserId}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setLiveMessages((prev) => prev.filter((m) => m.channelId === id));
              chatApi.markRead(id).catch(() => undefined);
            }}
            onNew={() => setShowNew(true)}
          />
        </div>
      )}

      {showNew && (
        <NewChannelDialog
          onCancel={() => setShowNew(false)}
          onCreated={(ch) => {
            setShowNew(false);
            setChannels((prev) => [ch, ...prev.filter((c) => c.id !== ch.id)]);
            setSelectedId(ch.id);
            setLiveMessages([]);
          }}
        />
      )}
    </aside>
  );
}

function renderChannelTitle(ch: Channel, currentUserId: string): string {
  if (ch.type === 'group') return ch.title ?? 'Без названия';
  const other = ch.members.find((m) => m.userId !== currentUserId);
  return other?.name ?? other?.email ?? 'Личный чат';
}

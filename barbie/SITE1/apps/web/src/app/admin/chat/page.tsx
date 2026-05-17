'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { chatApi, getCurrentUserId, type Channel, type Message } from '@/lib/chat-api';
import { useChatStream } from '@/components/chat/useChatStream';
import { ChannelList } from '@/components/chat/ChannelList';
import { MessageThread } from '@/components/chat/MessageThread';
import { MessageInput } from '@/components/chat/MessageInput';
import { NewChannelDialog } from '@/components/chat/NewChannelDialog';

export default function ChatPage() {
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
      // Select first channel if none selected.
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    reloadChannels();
  }, [reloadChannels]);

  // SSE event router.
  useChatStream(
    useCallback(
      (ev) => {
        switch (ev.type) {
          case 'message.created': {
            const msg = ev.payload as Message;
            setLiveMessages((prev) => [...prev, msg]);
            // Bump lastMessageAt + unread counter (if not selected channel).
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
            // If looking at this channel — mark read after a short delay (debounce).
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
            // Easiest correct: refetch channel list (and selected channel).
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
    // SSE will deliver the canonical message; we don't optimistic-insert.
    await chatApi.sendMessage(selected.id, body);
  }

  if (loading) {
    return <div className="p-8 text-text-mute font-mono text-xs">loading chat…</div>;
  }

  if (!currentUserId) {
    return (
      <div className="p-8 text-text-mute text-sm">
        Чат доступен только авторизованным сотрудникам.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {error && (
        <div className="mb-3 px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-4 h-[calc(100vh-180px)]">
        <ChannelList
          channels={channels}
          currentUserId={currentUserId}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            // Drop live buffer of OTHER channels to keep memory bounded.
            setLiveMessages((prev) => prev.filter((m) => m.channelId === id));
          }}
          onNew={() => setShowNew(true)}
        />
        <div className="border border-border rounded bg-surface flex flex-col overflow-hidden h-full">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-border shrink-0">
                <div className="text-sm font-semibold">
                  {renderChannelTitle(selected, currentUserId)}
                </div>
                <div className="text-[11px] text-text-mute font-mono mt-0.5">
                  {selected.type === 'dm' ? 'Личный чат' : 'Группа'} ·{' '}
                  {selected.members.length} участ.
                </div>
              </div>
              <MessageThread
                channel={selected}
                currentUserId={currentUserId}
                liveMessages={liveMessages}
                onMessageMutated={(m) =>
                  setLiveMessages((prev) =>
                    prev.map((p) => (p.id === m.id ? m : p)),
                  )
                }
              />
              <MessageInput onSend={handleSend} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-mute text-sm">
              Выберите канал слева или создайте новый.
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}

function renderChannelTitle(ch: Channel, currentUserId: string): string {
  if (ch.type === 'group') return ch.title ?? 'Без названия';
  const other = ch.members.find((m) => m.userId !== currentUserId);
  return other?.name ?? other?.email ?? 'Личный чат';
}

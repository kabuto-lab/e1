'use client';

import { useEffect, useRef, useState } from 'react';
import { chatApi, type Channel, type Message } from '@/lib/chat-api';
import { MessageItem } from './MessageItem';

export function MessageThread({
  channel,
  currentUserId,
  liveMessages,
  onMessageMutated,
}: {
  channel: Channel;
  currentUserId: string;
  /** Messages from SSE for this channel (parent owns the buffer). */
  liveMessages: Message[];
  onMessageMutated: (msg: Message) => void;
}) {
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load + reset on channel change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHistory([]);
    setHasMore(true);
    chatApi
      .listMessages(channel.id)
      .then((msgs) => {
        if (cancelled) return;
        setHistory(msgs);
        setHasMore(msgs.length >= 50);
        // Mark as read on open.
        return chatApi.markRead(channel.id).catch(() => undefined);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channel.id]);

  // Merge history + live (de-dupe by id).
  const all = mergeMessages(history, liveMessages.filter((m) => m.channelId === channel.id));

  // Auto-scroll to bottom on new messages (only if user is near bottom).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [all.length]);

  async function loadMore(): Promise<void> {
    if (loadingMore || !hasMore || all.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = all[0];
      const older = await chatApi.listMessages(channel.id, oldest.id);
      setHistory((prev) => [...older, ...prev]);
      if (older.length < 50) setHasMore(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleEdit(messageId: string, body: string): Promise<void> {
    const updated = await chatApi.editMessage(messageId, body);
    onMessageMutated(updated);
    setHistory((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  async function handleDelete(messageId: string): Promise<void> {
    await chatApi.deleteMessage(messageId);
    // SSE event will refresh; locally mark as deleted as well.
    setHistory((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), body: '' } : m,
      ),
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {hasMore && (
        <div className="text-center py-3">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-xs text-text-mute hover:text-text disabled:opacity-50"
          >
            {loadingMore ? 'загружаем…' : 'Загрузить ещё'}
          </button>
        </div>
      )}
      {loading && <div className="p-6 text-center text-text-mute text-sm">loading…</div>}
      {error && (
        <div className="m-3 px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded-md">
          {error}
        </div>
      )}
      {!loading && all.length === 0 && !error && (
        <div className="p-6 text-center text-text-mute text-sm">
          Сообщений пока нет. Напишите первым.
        </div>
      )}
      <div className="flex flex-col">
        {all.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            channel={channel}
            isOwn={m.authorUserId === currentUserId}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

function mergeMessages(history: Message[], live: Message[]): Message[] {
  if (live.length === 0) return history;
  const byId = new Map<string, Message>();
  for (const m of history) byId.set(m.id, m);
  for (const m of live) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

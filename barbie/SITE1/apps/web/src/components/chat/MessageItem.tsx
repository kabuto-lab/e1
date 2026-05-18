'use client';

import { useState } from 'react';
import type { Channel, Message } from '@/lib/chat-api';

export function MessageItem({
  message,
  channel,
  isOwn,
  onEdit,
  onDelete,
}: {
  message: Message;
  channel: Channel;
  isOwn: boolean;
  onEdit: (messageId: string, body: string) => Promise<void> | void;
  onDelete: (messageId: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const author = channel.members.find((m) => m.userId === message.authorUserId);
  const authorLabel = author?.name ?? author?.email ?? 'Неизвестный';
  const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.deletedAt) {
    return (
      <div className="text-text-mute text-xs italic px-3 py-1">
        Сообщение удалено
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 px-3 py-2 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-baseline gap-2 text-[11px] text-text-mute">
        <span className="font-medium text-text">{authorLabel}</span>
        <span className="font-mono">{time}</span>
        {message.editedAt && <span className="italic">(изм.)</span>}
      </div>

      {editing ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = draft.trim();
            if (!trimmed) return;
            await onEdit(message.id, trimmed);
            setEditing(false);
          }}
          className="w-full max-w-md"
        >
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full p-2 bg-bg border border-border rounded-md text-sm"
            rows={3}
          />
          <div className="flex gap-2 mt-1 text-xs">
            <button
              type="submit"
              className="px-2 py-1 bg-accent text-bg font-semibold rounded-md"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(message.body);
              }}
              className="px-2 py-1 border border-border rounded-md"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <div
          className={`max-w-md px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
            isOwn ? 'bg-accent/20 border border-accent/30' : 'bg-surface-2 border border-border'
          }`}
        >
          {message.body}
          {message.attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {message.attachments.map((a) => (
                <li key={a.mediaKey} className="text-[11px] font-mono text-text-mute">
                  📎 {a.name} ({Math.round(a.size / 1024)} КБ)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isOwn && !editing && (
        <div className="flex gap-2 text-[10px] text-text-mute">
          <button onClick={() => setEditing(true)} className="hover:text-text">
            Изм.
          </button>
          <button
            onClick={() => {
              if (confirm('Удалить сообщение?')) onDelete(message.id);
            }}
            className="hover:text-red-400"
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

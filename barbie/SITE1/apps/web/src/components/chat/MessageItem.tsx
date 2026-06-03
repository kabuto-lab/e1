'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { Channel, Message } from '@/lib/chat-api';

/**
 * Детерминированный цвет имени по userId — у каждого сотрудника свой стабильный
 * цвет (как в Slack/Discord). Палитра подобрана читаемой на тёмном bg-elev.
 */
const NAME_COLORS = [
  '#6BD68A', '#E6CF9B', '#7FB3FF', '#F2A8C2', '#C9A86A', '#9AD0C2',
  '#F0A868', '#B89AE6', '#E68A8A', '#8AD6CE', '#D6C28A', '#A8C2F2',
];
function authorColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

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
    <div className={`flex px-2 pt-2 pb-1.5 text-[13px] ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className="group relative w-full px-2 pt-1.5 pb-1 font-light leading-[1.3] whitespace-pre-wrap break-words text-white"
      >
        {/* Верхняя линия: время (мьютед) ПЕРЕД именем автора. Заякорено на стороне
            пузыря (свои — справа, чужие — слева), bg маскирует кромку, без переноса. */}
        <span
          className={`absolute -top-[5px] ${isOwn ? 'right-4' : 'left-4'} px-1 leading-none text-[8px] font-semibold bg-bg-elev whitespace-nowrap inline-flex items-baseline gap-1`}
        >
          <span className="font-normal text-text-dim">
            {message.editedAt && 'изм. '}
            {time}
          </span>
          <span style={{ color: authorColor(message.authorUserId), letterSpacing: '0.1em' }}>
            {authorLabel}
          </span>
        </span>

        {/* Нижняя линия: на hover — кружки действий (правка/удаление своих). */}
        {!editing && isOwn && (
          <div className="absolute -bottom-2 right-2 hidden group-hover:flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Изменить"
              aria-label="Изменить"
              className="w-4 h-4 rounded-full flex items-center justify-center bg-bg-elev border border-line text-text-mute hover:text-text hover:border-line-strong"
            >
              <Pencil size={9} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Удалить сообщение?')) onDelete(message.id);
              }}
              title="Удалить"
              aria-label="Удалить"
              className="w-4 h-4 rounded-full flex items-center justify-center bg-bg-elev border border-red-500/50 text-red-400 hover:bg-red-500/15"
            >
              <X size={9} />
            </button>
          </div>
        )}

        {editing ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = draft.trim();
              if (!trimmed) return;
              await onEdit(message.id, trimmed);
              setEditing(false);
            }}
          >
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full p-2 bg-bg border border-border rounded-md text-sm"
              rows={3}
            />
            <div className="flex gap-2 mt-1 text-xs">
              <button type="submit" className="px-2 py-1 bg-accent text-bg font-semibold rounded-md">
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
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

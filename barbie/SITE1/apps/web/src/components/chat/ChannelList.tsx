'use client';

import type { Channel } from '@/lib/chat-api';

export function ChannelList({
  channels,
  currentUserId,
  selectedId,
  onSelect,
  onNew,
}: {
  channels: Channel[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="border border-border rounded bg-surface flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <h2 className="text-xs uppercase tracking-widest text-text-mute">Чаты</h2>
        <button
          onClick={onNew}
          className="px-2 py-1 text-xs bg-accent text-bg font-semibold rounded"
        >
          + Новый
        </button>
      </div>
      <ul className="divide-y divide-border overflow-y-auto flex-1">
        {channels.length === 0 && (
          <li className="p-6 text-center text-text-mute text-sm">
            Пока нет каналов. Нажмите «+ Новый».
          </li>
        )}
        {channels.map((ch) => {
          const title = renderTitle(ch, currentUserId);
          const active = selectedId === ch.id;
          return (
            <li
              key={ch.id}
              className={`p-3 cursor-pointer ${active ? 'bg-surface-2' : 'hover:bg-surface-2/50'}`}
              onClick={() => onSelect(ch.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">{title}</div>
                {ch.unreadCount > 0 && !active && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent text-bg shrink-0">
                    {ch.unreadCount}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-mute font-mono mt-0.5">
                {ch.type === 'dm' ? 'DM' : 'GROUP'} · {ch.members.length} участ.
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function renderTitle(ch: Channel, currentUserId: string): string {
  if (ch.type === 'group') return ch.title ?? 'Без названия';
  const other = ch.members.find((m) => m.userId !== currentUserId);
  return other?.name ?? other?.email ?? 'Личный чат';
}

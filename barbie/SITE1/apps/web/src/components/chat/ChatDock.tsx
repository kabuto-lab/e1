'use client';

import { ChevronLeft, Plus, X } from 'lucide-react';
import type { Channel } from '@/lib/chat-api';
import type { ChatState } from './useChatState';
import { ChannelList } from './ChannelList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { NewChannelDialog } from './NewChannelDialog';

/**
 * ChatDock — докнутая панель чата во всю высоту экрана (1/6 ширины) рядом с
 * рейлом. НЕ отдельная страница: AdminShell сжимает дашборд, отдавая колонку
 * под док. Презентационный — всё состояние приходит из общего useChatState
 * (тот же источник, что питает бейдж непрочитанного в рейле; один SSE).
 *
 * Компактный одноколоночный layout: список каналов ⟷ открытый тред (с «‹ каналы»).
 */
export function ChatDock({ chat, onClose }: { chat: ChatState; onClose: () => void }) {
  const { selected, currentUserId, loading, error } = chat;

  return (
    <aside className="sticky top-0 h-screen border-r border-line bg-bg-elev flex flex-col min-w-0 z-20">
      <div className="shrink-0 h-12 px-3 flex items-center gap-2 border-b border-line">
        {selected && (
          <button
            type="button"
            onClick={() => chat.selectChannel(null)}
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
            onClick={() => chat.setShowNew(true)}
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
            liveMessages={chat.liveMessages}
            onMessageMutated={chat.onMessageMutated}
          />
          <MessageInput onSend={chat.handleSend} />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChannelList
            channels={chat.channels}
            currentUserId={currentUserId}
            selectedId={chat.selectedId}
            onSelect={(id) => chat.selectChannel(id)}
            onNew={() => chat.setShowNew(true)}
          />
        </div>
      )}

      {chat.showNew && (
        <NewChannelDialog
          onCancel={() => chat.setShowNew(false)}
          onCreated={chat.onChannelCreated}
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

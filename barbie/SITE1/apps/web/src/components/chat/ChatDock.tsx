'use client';

import { X } from 'lucide-react';
import type { ChatState } from './useChatState';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';

/**
 * ChatDock — докнутая панель общего чата сотрудников во всю высоту экрана
 * (1/6 ширины) рядом с рейлом. Один общий канал (не создаётся вручную) — без
 * списка каналов и создания: сразу тред + ввод. История persistent.
 * Презентационный: состояние из общего useChatState (тот же источник, что у
 * бейджа непрочитанного в рейле; один SSE).
 */
export function ChatDock({
  chat,
  open,
  onClose,
}: {
  chat: ChatState;
  /** Панель видима (для скролл-анкоринга треда при показе). */
  open: boolean;
  onClose: () => void;
}) {
  const { channel, currentUserId, loading, error } = chat;

  return (
    <aside className="nas-chat-font sticky top-0 h-screen border-r border-line bg-bg-elev flex flex-col min-w-0 z-20">
      <div className="shrink-0 h-12 px-3 flex items-center gap-2 border-b border-line">
        <span className="text-[13px] font-semibold truncate flex-1">
          {channel?.title ?? 'Общий чат'}
        </span>
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
      ) : channel ? (
        <>
          <MessageThread
            channel={channel}
            currentUserId={currentUserId}
            liveMessages={chat.liveMessages}
            onMessageMutated={chat.onMessageMutated}
            active={open}
          />
          <MessageInput onSend={chat.handleSend} />
        </>
      ) : (
        <div className="p-4 text-text-mute text-[12px]">Чат недоступен.</div>
      )}
    </aside>
  );
}

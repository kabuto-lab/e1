'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

export function MessageInput({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (body: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Авто-рост: высота по содержимому (до ~6 строк), потом скролл. Без фикс-rows
  // и преждевременного скролла.
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  async function submit(): Promise<void> {
    const body = draft.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    try {
      await onSend(body);
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-line px-2 py-1.5 bg-surface">
      <div className="flex gap-1.5 items-end">
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Сообщение…"
          rows={1}
          disabled={disabled || sending}
          className="flex-1 px-2 py-1.5 bg-bg border border-line rounded outline-none focus:border-accent resize-none text-[13px] leading-snug disabled:opacity-50 overflow-y-auto font-admin"
        />
        <button
          onClick={submit}
          disabled={disabled || sending || draft.trim().length === 0}
          aria-label="Отправить"
          title="Отправить"
          className="shrink-0 w-8 h-8 grid place-items-center bg-accent text-bg rounded disabled:opacity-50"
        >
          {sending ? '…' : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

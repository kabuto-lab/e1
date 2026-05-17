'use client';

import { useState, type KeyboardEvent } from 'react';

export function MessageInput({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (body: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

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
    <div className="border-t border-border p-3 bg-surface">
      <div className="flex gap-2 items-end">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Напишите сообщение… (Shift+Enter — перенос строки)"
          rows={2}
          disabled={disabled || sending}
          className="flex-1 px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent resize-none text-sm disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={disabled || sending || draft.trim().length === 0}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded disabled:opacity-50 self-stretch"
        >
          {sending ? '…' : 'Отпр.'}
        </button>
      </div>
    </div>
  );
}

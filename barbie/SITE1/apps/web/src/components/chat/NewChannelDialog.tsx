'use client';

import { useState } from 'react';
import { chatApi, type Channel } from '@/lib/chat-api';

/**
 * NewChannelDialog — простейший modal-стайл диалог для создания канала.
 *
 * Phase 0: пользователь ручками вписывает UUID'ы сотрудников. В Phase 1 это
 * заменится на picker'е по `/v1/staff` или `/v1/tenant-users` (когда такой
 * endpoint появится).
 */
export function NewChannelDialog({
  onCreated,
  onCancel,
}: {
  onCreated: (channel: Channel) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'dm' | 'group'>('dm');
  const [title, setTitle] = useState('');
  const [memberIdsRaw, setMemberIdsRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const memberIds = memberIdsRaw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (memberIds.length === 0) {
      setError('Укажите минимум одного участника (UUID).');
      return;
    }
    if (type === 'group' && !title.trim()) {
      setError('Для группы нужно название.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const channel = await chatApi.createChannel({
        type,
        title: type === 'group' ? title.trim() : undefined,
        memberIds,
      });
      onCreated(channel);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <form
        onSubmit={submit}
        className="bg-surface border border-border rounded p-5 w-full max-w-md space-y-4"
      >
        <h3 className="text-sm uppercase tracking-widest text-text-mute">Новый чат</h3>

        <div className="flex gap-2">
          {(['dm', 'group'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1.5 text-sm rounded border ${
                type === t ? 'border-accent bg-accent/10' : 'border-border'
              }`}
            >
              {t === 'dm' ? '1:1' : 'Группа'}
            </button>
          ))}
        </div>

        {type === 'group' && (
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wider text-text-mute">Название</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">
            UUID участников
          </span>
          <textarea
            required
            value={memberIdsRaw}
            onChange={(e) => setMemberIdsRaw(e.target.value)}
            rows={3}
            placeholder={
              type === 'dm'
                ? '01H8X… (один UUID сотрудника)'
                : '01H8X…\n01J9Y… (по одному на строку или через запятую)'
            }
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent font-mono text-xs"
          />
          <span className="text-[11px] text-text-mute italic">
            Phase 0: пока без picker'а — выпиши user_id из таблицы tenant_users.
          </span>
        </label>

        {error && (
          <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-xs rounded">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm border border-border rounded"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm bg-accent text-bg font-semibold rounded disabled:opacity-50"
          >
            {busy ? '…' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

/**
 * Доп. рабочие Telegram-аккаунты менеджера/сотрудника — не основной users.telegramId
 * (тот привязывается на /cabinet/settings как у всех), а дополнительные слоты, которые
 * можно назначать на конкретные анкеты (см. select «Оператор» на /dashboard/models).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Send, Trash2, Pencil, Check, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api, type ExtraTelegramAccount } from '@/lib/api-client';

const POLL_INTERVAL_MS = 2500;

function TelegramAccountsPageInner() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

  const [accounts, setAccounts] = useState<ExtraTelegramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [linkToken, setLinkToken] = useState<{ token: string; expiresAt: string; deepLink: string | null } | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await api.getExtraTelegramAccounts();
      setAccounts(rows);
      return rows;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить список');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const handleCreateToken = async () => {
    setCreatingToken(true);
    setError(null);
    try {
      const before = accounts.length;
      const tkn = await api.createExtraTelegramLinkToken();
      setLinkToken(tkn);
      if (tkn.deepLink) {
        window.open(tkn.deepLink, '_blank', 'noopener,noreferrer');
      }
      stopPolling();
      pollTimerRef.current = window.setInterval(async () => {
        const rows = await load();
        if (rows && rows.length > before) {
          stopPolling();
          setLinkToken(null);
        }
      }, POLL_INTERVAL_MS);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось создать токен');
    } finally {
      setCreatingToken(false);
    }
  };

  const startEditing = (acc: ExtraTelegramAccount) => {
    setEditingId(acc.id);
    setLabelDraft(acc.label ?? '');
  };

  const saveLabel = async (id: string) => {
    setSavingLabel(true);
    try {
      const updated = await api.renameExtraTelegramAccount(id, labelDraft.trim() || null);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось переименовать');
    } finally {
      setSavingLabel(false);
    }
  };

  const handleDelete = async (acc: ExtraTelegramAccount) => {
    if (!window.confirm(`Отвязать «${acc.label || acc.telegramUsername || acc.telegramId}»? Анкеты, назначенные на этот TG, вернутся к основному Telegram оператора.`)) return;
    setDeletingId(acc.id);
    try {
      await api.deleteExtraTelegramAccount(acc.id);
      setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось отвязать');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`flex-1 font-body ${t.page}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Telegram-аккаунты
          </h1>
          <p className={`mt-1 text-sm ${t.muted}`}>
            Дополнительные рабочие Telegram — можно назначать на конкретные анкеты в select «Оператор».
            Основной Telegram (для входа/уведомлений) привязывается отдельно, в личных настройках.
          </p>
        </div>
        <button
          type="button"
          disabled={creatingToken}
          onClick={handleCreateToken}
          className={`${t.btnPrimary} px-4 py-2 text-sm`}
        >
          {creatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Добавить Telegram
        </button>
      </div>

      {linkToken && (
        <div className={`${t.card} mb-6 p-5`}>
          <p className={`mb-3 text-sm ${t.muted}`}>
            {linkToken.deepLink
              ? 'Мы открыли бот в новой вкладке — нажми там «Start» и подтверди привязку. Страница обновится сама.'
              : 'Бот не сконфигурирован — отправь токен вручную командой /start linkx_<token>.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {linkToken.deepLink && (
              <a
                href={linkToken.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${t.btnPrimary} px-4 py-2 text-sm`}
              >
                <Send className="h-4 w-4" /> Открыть бота
              </a>
            )}
            <button type="button" onClick={() => load()} className={`${t.btnSecondary} px-3 py-2 text-xs`}>
              Проверить сейчас
            </button>
            <span className={`font-mono text-xs ${t.muted}`}>{linkToken.token}</span>
          </div>
        </div>
      )}

      {error && <div className={`${t.noticeErr} mb-4`}>{error}</div>}

      {loading ? (
        <div className={`flex items-center gap-2 text-sm ${t.muted}`}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : accounts.length === 0 ? (
        <div className={`${t.card} p-8 text-center text-sm ${t.muted}`}>Доп. Telegram-аккаунтов пока нет</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div key={acc.id} className={`${t.card} flex flex-col gap-2 p-4`}>
              {editingId === acc.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    placeholder="Например, «Рабочий 2»"
                    className={t.input}
                  />
                  <button type="button" disabled={savingLabel} onClick={() => saveLabel(acc.id)} className={`${t.btnPrimary} p-2`}>
                    {savingLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className={`${t.btnSecondary} p-2`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate font-display text-sm font-semibold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
                    {acc.label || 'Без названия'}
                  </span>
                  <button type="button" onClick={() => startEditing(acc)} className={`${t.muted} hover:text-current`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className={`text-xs ${t.muted}`}>
                {acc.telegramUsername ? `@${acc.telegramUsername}` : `ID: ${acc.telegramId}`}
              </div>
              <button
                type="button"
                disabled={deletingId === acc.id}
                onClick={() => handleDelete(acc)}
                className={`${t.btnDanger} mt-1 self-start px-2.5 py-1 text-xs`}
              >
                {deletingId === acc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Отвязать
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TelegramAccountsPage() {
  return (
    <ProtectedRoute requiredRoles={['manager', 'employee']}>
      <TelegramAccountsPageInner />
    </ProtectedRoute>
  );
}

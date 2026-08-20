'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Ban, ShieldCheck, Search } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { SelectDropdown } from '@/components/SelectDropdown';
import api, { type BlacklistReason, type BlacklistHistoryEntry } from '@/lib/api-client';

const REASON_OPTIONS: { value: BlacklistReason; label: string }[] = [
  { value: 'fake_photos', label: 'Фейковые фото' },
  { value: 'client_complaints', label: 'Жалобы клиентов' },
  { value: 'fraud', label: 'Мошенничество' },
  { value: 'no_show', label: 'Неявка' },
  { value: 'video_fake', label: 'Поддельное видео' },
  { value: 'non_payment', label: 'Неоплата' },
  { value: 'rudeness', label: 'Грубость' },
  { value: 'pressure', label: 'Давление/угрозы' },
];

const REASON_LABELS: Record<BlacklistReason, string> = Object.fromEntries(
  REASON_OPTIONS.map((o) => [o.value, o.label]),
) as Record<BlacklistReason, string>;

const ROLE_LABELS: Record<string, string> = { client: 'Клиент', model: 'Модель', manager: 'Менеджер' };

const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  pending_verification: 'Ожидает проверки',
  suspended: 'Приостановлен',
  blacklisted: 'Заблокирован',
};

type BlockableUser = { id: string; login: string | null; email: string | null; role: string; status: string };

export default function DashboardBlacklistPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

  const [history, setHistory] = useState<BlacklistHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BlockableUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [blockTarget, setBlockTarget] = useState<BlockableUser | null>(null);
  const [blockReason, setBlockReason] = useState<BlacklistReason>('client_complaints');
  const [blockDescription, setBlockDescription] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.blacklistHistory();
      setHistory(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить историю блокировок');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const rows = await api.searchBlockableUsers(q);
      setSearchResults(rows);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => runSearch(searchQuery), 300);
    return () => clearTimeout(handle);
  }, [searchQuery, runSearch]);

  const openBlockModal = (u: BlockableUser) => {
    setBlockReason('client_complaints');
    setBlockDescription('');
    setBlockTarget(u);
  };

  const submitBlock = async () => {
    if (!blockTarget) return;
    setBlockSubmitting(true);
    setError(null);
    try {
      await api.blacklistAdd({
        entityType: blockTarget.role as 'client' | 'model' | 'manager',
        entityId: blockTarget.id,
        reason: blockReason,
        description: blockDescription.trim() || undefined,
      });
      setBlockTarget(null);
      setSearchResults((prev) => prev.map((u) => (u.id === blockTarget.id ? { ...u, status: 'blacklisted' } : u)));
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось заблокировать пользователя');
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleRestore = async (entry: BlacklistHistoryEntry) => {
    if (!window.confirm(`Разблокировать «${entry.entityLogin ?? entry.entityEmail ?? entry.entityId}»?`)) return;
    setRestoringId(entry.id);
    setError(null);
    try {
      await api.blacklistRestore(entry.entityType, entry.entityId);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось разблокировать пользователя');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'moderator']}>
      <div className={`flex min-h-0 flex-1 flex-col ${t.page}`}>
        <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={t.h1}>Чёрный список</h1>
            <p className={`mt-1 text-sm ${t.muted}`}>Блокировка входа для клиентов, моделей и менеджеров</p>
          </div>
          <Link href="/dashboard" className={`inline-flex items-center gap-2 text-sm font-medium ${t.link} shrink-0`}>
            <ArrowLeft className="h-4 w-4" />
            На панель
          </Link>
        </div>

        {error ? (
          <div className={`mb-4 flex items-center gap-2 ${t.noticeErr}`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {/* Поиск и блокировка */}
        <div className={`mb-6 p-5 ${t.card}`}>
          <h2 className={t.h2}>Заблокировать пользователя</h2>
          <div className="relative mt-3">
            <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.muted}`} />
            <input
              className={`${t.input} pl-9`}
              placeholder="Логин или email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={`mt-3 ${t.tableWrap}`}>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={t.th}>Роль</th>
                  <th className={t.th}>Email / ID</th>
                  <th className={t.th}>Логин</th>
                  <th className={t.th}>Статус</th>
                  <th className={t.th}></th>
                </tr>
              </thead>
              <tbody>
                {searching ? (
                  <tr>
                    <td colSpan={5} className={`py-6 text-center text-sm ${t.muted}`}>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Поиск…
                      </span>
                    </td>
                  </tr>
                ) : searchResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`py-6 text-center text-sm ${t.muted}`}>
                      {searchQuery ? 'Никого не найдено' : 'Начните вводить логин или email'}
                    </td>
                  </tr>
                ) : (
                  searchResults.map((u) => (
                    <tr key={u.id} className={t.tr}>
                      <td className={t.td}>
                        <RoleBadge role={u.role} L={L} />
                      </td>
                      <td className={t.td}>
                        <div className="font-mono text-xs">{u.email ?? '—'}</div>
                        <div className={`font-mono text-[11px] ${t.muted}`}>{u.id.slice(0, 8)}…</div>
                      </td>
                      <td className={t.td}>
                        <span className="font-mono text-xs">{u.login ?? '—'}</span>
                      </td>
                      <td className={t.td}>
                        <StatusBadge status={u.status} L={L} />
                      </td>
                      <td className={t.td}>
                        {u.status !== 'blacklisted' ? (
                          <button
                            type="button"
                            onClick={() => openBlockModal(u)}
                            title="Заблокировать"
                            className={`inline-flex items-center justify-center rounded p-1.5 transition-colors ${
                              L ? 'text-[#d63638] hover:bg-[#fcf0f1]' : 'text-red-400 hover:bg-red-500/10'
                            }`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* История */}
        {loading ? (
          <div className={`flex items-center gap-2 text-sm ${t.muted}`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка…
          </div>
        ) : (
          <div className={t.tableWrap}>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={t.th}>Логин</th>
                  <th className={t.th}>Роль</th>
                  <th className={t.th}>Причина</th>
                  <th className={t.th}>Статус</th>
                  <th className={t.th}>Заблокировал</th>
                  <th className={t.th}>Дата</th>
                  <th className={t.th}></th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className={t.tr}>
                    <td className={t.td}>
                      <div className="font-mono text-xs">{entry.entityLogin ?? entry.entityEmail ?? entry.entityId.slice(0, 8)}</div>
                      {entry.description ? <div className={`mt-0.5 text-xs ${t.muted}`}>{entry.description}</div> : null}
                    </td>
                    <td className={t.td}>{ROLE_LABELS[entry.entityType] ?? entry.entityType}</td>
                    <td className={t.td}>{REASON_LABELS[entry.reason] ?? entry.reason}</td>
                    <td className={t.td}>
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[11px] ${
                          entry.status === 'blocked'
                            ? L
                              ? 'border-[#d63638]/30 bg-[#fcf0f1] text-[#d63638]'
                              : 'border-red-500/30 bg-red-500/10 text-red-300'
                            : L
                              ? 'border-[#00a32a]/30 bg-[#edfaef] text-[#00a32a]'
                              : 'border-green-500/30 bg-green-500/10 text-green-300'
                        }`}
                      >
                        {entry.status === 'blocked' ? 'Заблокирован' : 'Восстановлен'}
                      </span>
                    </td>
                    <td className={t.td}>
                      <span className={t.muted}>{entry.blockedByLogin ?? '—'}</span>
                    </td>
                    <td className={t.td}>
                      <span className={t.muted}>{new Date(entry.blockedAt).toLocaleDateString('ru-RU')}</span>
                    </td>
                    <td className={t.td}>
                      {entry.status === 'blocked' ? (
                        <button
                          type="button"
                          disabled={restoringId === entry.id}
                          onClick={() => handleRestore(entry)}
                          title="Разблокировать"
                          className={`inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
                            L ? 'text-[#00a32a] hover:bg-[#edfaef]' : 'text-green-400 hover:bg-green-500/10'
                          }`}
                        >
                          {restoringId === entry.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className={`py-8 text-center text-sm ${t.muted}`}>
                      Пока пусто
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {blockTarget ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setBlockTarget(null)}>
          <div className={`w-full max-w-md p-6 ${t.card}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={t.h2}>Заблокировать «{blockTarget.login ?? blockTarget.email}»</h2>
            <p className={`mt-1 text-sm ${t.muted}`}>
              Вход в аккаунт будет заблокирован{blockTarget.role === 'model' ? ', анкета скроется из каталога' : ''}.
            </p>

            <div className="mt-4">
              <label className={t.label}>Причина</label>
              <SelectDropdown value={blockReason} onChange={(v) => setBlockReason(v as BlacklistReason)} light={L} options={REASON_OPTIONS} />
            </div>

            <div className="mt-4">
              <label className={t.label}>Комментарий (опционально)</label>
              <textarea
                className={t.textarea}
                rows={3}
                value={blockDescription}
                onChange={(e) => setBlockDescription(e.target.value)}
                placeholder="Детали блокировки — видно только admin/moderator"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={t.btnSecondary} onClick={() => setBlockTarget(null)} disabled={blockSubmitting}>
                Отмена
              </button>
              <button type="button" className={t.btnDanger} onClick={submitBlock} disabled={blockSubmitting}>
                {blockSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}

function RoleBadge({ role, L }: { role: string; L: boolean }) {
  const paletteDark: Record<string, string> = {
    manager: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    model: 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30',
    client: 'bg-white/[0.06] text-gray-300 border-white/[0.1]',
  };
  const paletteLight: Record<string, string> = {
    manager: 'bg-[#fef8ee] text-[#b26200] border-[#b26200]/30',
    model: 'bg-[#f0f6fc] text-[#135e96] border-[#135e96]/30',
    client: 'bg-[#f0f0f1] text-[#50575e] border-[#8c8f94]/30',
  };
  const palette = L ? paletteLight : paletteDark;
  const cls = palette[role] ?? palette.client;
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusBadge({ status, L }: { status: string; L: boolean }) {
  const paletteDark: Record<string, string> = {
    active: 'bg-green-500/10 text-green-300 border-green-500/30',
    pending_verification: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    suspended: 'bg-red-500/10 text-red-300 border-red-500/30',
    blacklisted: 'bg-red-500/10 text-red-200 border-red-500/30',
  };
  const paletteLight: Record<string, string> = {
    active: 'bg-[#edfaef] text-[#00a32a] border-[#00a32a]/30',
    pending_verification: 'bg-[#fef8ee] text-[#b26200] border-[#b26200]/30',
    suspended: 'bg-[#fcf0f1] text-[#d63638] border-[#d63638]/30',
    blacklisted: 'bg-[#d63638] text-white border-transparent',
  };
  const palette = L ? paletteLight : paletteDark;
  const cls = palette[status] ?? (L ? 'bg-[#f0f0f1] text-[#50575e] border-[#8c8f94]/30' : 'bg-white/[0.06] text-gray-300 border-white/[0.1]');

  return <span className={`inline-block rounded border px-2 py-0.5 text-[11px] ${cls}`}>{STATUS_LABELS[status] ?? status}</span>;
}

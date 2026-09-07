'use client';

/**
 * Очередь заявок на вывод — admin/moderator одобряют/отклоняют/отмечают выплаченными
 * любые заявки; менеджер видит и решает только по заявкам своих моделей (плюс свои
 * собственные заявки на комиссию — их одобряет уже admin/moderator, см. payouts.service.ts).
 * Сам банковский перевод происходит вне платформы — это только учёт решения.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Check, X, CircleDollarSign, Lock } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { useAuth } from '@/components/AuthProvider';
import { api, type PayoutRequest, type PayoutRequestStatus } from '@/lib/api-client';

const STATUS_LABEL: Record<PayoutRequestStatus, string> = {
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  paid: 'Выплачено',
  rejected: 'Отклонено',
};

const TABS: { value: PayoutRequestStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'На рассмотрении' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'paid', label: 'Выплачено' },
  { value: 'rejected', label: 'Отклонено' },
  { value: 'all', label: 'Все' },
];

export default function DashboardPayoutsPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const { user: authUser } = useAuth();

  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [tab, setTab] = useState<PayoutRequestStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: PayoutRequestStatus | 'all') => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getPayoutRequests(status === 'all' ? undefined : status);
      setRequests(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(tab); }, [tab, load]);

  const act = async (id: string, status: 'approved' | 'rejected' | 'paid') => {
    if (status === 'rejected' && !window.confirm('Отклонить заявку?')) return;
    setBusyId(id);
    try {
      await api.transitionPayoutRequest(id, status);
      await load(tab);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось выполнить действие');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`flex-1 font-body ${t.page}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Выплаты
          </h1>
          <p className={`mt-1 text-sm ${t.muted}`}>Заявки моделей/менеджеров на вывод заработанного</p>
        </div>
        <button type="button" onClick={() => load(tab)} className={`${t.btnSecondary} shrink-0 px-3 py-1.5 text-xs`}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            type="button"
            onClick={() => setTab(tb.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === tb.value
                ? L ? 'border-[#2271b1] bg-[#2271b1] text-white' : 'border-[#d4af37] bg-[#d4af37] text-black'
                : L ? 'border-[#c3c4c7] text-[#50575e] hover:bg-[#f6f7f7]' : 'border-white/10 text-white/60 hover:bg-white/[0.04]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {error && <div className={`${t.noticeErr} mb-4`}>{error}</div>}

      {loading ? (
        <div className={`flex items-center gap-2 text-sm ${t.muted}`}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : requests.length === 0 ? (
        <div className={`${t.card} p-8 text-center text-sm ${t.muted}`}>Заявок нет</div>
      ) : (
        <div className={t.tableWrap}>
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className={`${t.th} min-w-[110px]`}>Пользователь</th>
                <th className={`${t.th} min-w-[110px]`}>Сумма</th>
                <th className={`${t.th} min-w-[220px]`}>Реквизиты</th>
                <th className={`${t.th} min-w-[150px]`}>Дата заявки</th>
                <th className={`${t.th} min-w-[130px]`}>Статус</th>
                <th className={`${t.th} min-w-[180px]`}>Комментарий</th>
                <th className={`${t.th} min-w-[170px]`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className={t.tr}>
                  <td className={`${t.td} min-w-[110px] font-mono text-xs`}>{r.userId.slice(0, 8)}…</td>
                  <td className={`${t.td} min-w-[110px] font-bold ${accent}`}>{r.amount} ₽</td>
                  <td className={`${t.td} min-w-[220px] max-w-[220px]`}>
                    {r.requisites ? (
                      <span className="whitespace-pre-wrap break-words" title={r.requisites}>{r.requisites}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={`${t.td} min-w-[150px]`}>
                    {new Date(r.requestedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                  <td className={`${t.td} min-w-[130px]`}>{STATUS_LABEL[r.status]}</td>
                  <td className={`${t.td} min-w-[180px] max-w-[200px] truncate`}>{r.note ?? '—'}</td>
                  <td className={`${t.td} min-w-[170px]`}>
                    {authUser?.role === 'manager' && r.userId === authUser.id ? (
                      <span
                        title="Заявку менеджера на комиссию одобряет только admin или moderator — самоодобрение недоступно"
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          L ? 'bg-[#fcf9e8] text-[#996800]' : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        <Lock className="h-3 w-3" />
                        Admin / Moderator
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === 'pending' && (
                          <>
                            <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, 'approved')} className={`${t.btnPrimary} px-2.5 py-1 text-xs`}>
                              <Check className="h-3.5 w-3.5" /> Одобрить
                            </button>
                            <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, 'rejected')} className={`${t.btnDanger} px-2.5 py-1 text-xs`}>
                              <X className="h-3.5 w-3.5" /> Отклонить
                            </button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <>
                            <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, 'paid')} className={`${t.btnPrimary} px-2.5 py-1 text-xs`}>
                              <CircleDollarSign className="h-3.5 w-3.5" /> Отметить выплаченной
                            </button>
                            <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, 'rejected')} className={`${t.btnDanger} px-2.5 py-1 text-xs`}>
                              <X className="h-3.5 w-3.5" /> Отклонить
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

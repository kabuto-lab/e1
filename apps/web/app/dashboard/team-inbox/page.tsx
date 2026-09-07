'use client';

/**
 * Модерация обращений — общий инбокс менеджера/сотрудника: все диалоги клиент↔модель
 * по анкетам их команды (см. MessagesService.getTeamInbox), с захватом диалога в работу.
 * Вынесено из бокового списка ChatPanel в отдельный раздел.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, MessageSquare, Send } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api, type TelegramRelayThreadItem } from '@/lib/api-client';
import type { TeamInboxItem } from '@/types/chat';
import { AVAILABILITY_CLIENT_LABEL, AVAILABILITY_DOT_COLOR } from '@/lib/availability';

function TeamInboxPageInner() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

  const [items, setItems] = useState<TeamInboxItem[]>([]);
  const [tgItems, setTgItems] = useState<TelegramRelayThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tgBusyId, setTgBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [platform, telegram] = await Promise.all([api.getTeamInbox(), api.getTelegramTeamInbox()]);
      setItems(platform);
      setTgItems(telegram);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить обращения');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const claim = async (conversationId: string) => {
    setBusyId(conversationId);
    try {
      await api.claimConversation(conversationId);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось взять диалог в работу');
    } finally {
      setBusyId(null);
    }
  };

  const release = async (conversationId: string) => {
    setBusyId(conversationId);
    try {
      await api.releaseConversation(conversationId);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось отпустить диалог');
    } finally {
      setBusyId(null);
    }
  };

  const claimTelegram = async (threadId: string) => {
    setTgBusyId(threadId);
    try {
      await api.claimTelegramThread(threadId);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось взять обращение в работу');
    } finally {
      setTgBusyId(null);
    }
  };

  return (
    <div className={`flex-1 font-body ${t.page}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Модерация
          </h1>
          <p className={`mt-1 text-sm ${t.muted}`}>Обращения клиентов по анкетам вашей команды</p>
        </div>
        <button type="button" onClick={() => load()} className={`${t.btnSecondary} shrink-0 px-3 py-1.5 text-xs`}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {error && <div className={`${t.noticeErr} mb-4`}>{error}</div>}

      {loading ? (
        <div className={`flex items-center gap-2 text-sm ${t.muted}`}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : (
        <>
      <h2 className={`mb-3 font-body text-xs font-bold uppercase tracking-widest ${t.muted}`}>
        Платформа {items.length > 0 && `(${items.length})`}
      </h2>
      {items.length === 0 ? (
        <div className={`${t.card} mb-8 p-8 text-center text-sm ${t.muted}`}>Активных обращений нет</div>
      ) : (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const clientName = item.client?.fullName?.trim() || item.client?.login?.trim() || 'Клиент';
            const isMineClaim = item.claimedBy?.userId === authUser?.id;
            const claimerName = item.claimedBy
              ? item.claimedBy.fullName?.trim() || item.claimedBy.login?.trim() || 'Сотрудник'
              : null;
            const isBusy = busyId === item.conversationId;

            return (
              <div key={item.conversationId} className={`${t.card} flex flex-col gap-3 p-4`}>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/messages?conversation=${item.conversationId}`)}
                  className="flex items-start gap-3 text-left"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${L ? 'bg-[#f0f0f1]' : 'bg-white/[0.06]'}`}>
                    {item.model?.avatarUrl ? (
                      <img src={item.model.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <MessageSquare className={`h-4 w-4 ${t.muted}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>
                        {item.model?.displayName ?? 'Анкета'}
                      </span>
                      {item.model && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${AVAILABILITY_DOT_COLOR[item.model.availabilityStatus]}`}
                          title={AVAILABILITY_CLIENT_LABEL[item.model.availabilityStatus]}
                        />
                      )}
                    </div>
                    <div className={`truncate text-xs ${t.muted}`}>{clientName}</div>
                    <div className={`mt-1 truncate text-xs ${t.muted}`}>{item.lastMessage?.content ?? 'Нет сообщений'}</div>
                  </div>
                </button>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className={`text-xs ${t.muted}`}>
                    {item.claimedBy ? `В работе: ${isMineClaim ? 'вы' : claimerName}` : 'Свободно'}
                  </span>
                  {item.claimedBy && !isMineClaim ? (
                    authUser?.role === 'manager' && (
                      <button type="button" disabled={isBusy} onClick={() => release(item.conversationId)} className={`${t.btnSecondary} px-2.5 py-1 text-xs`}>
                        Освободить
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => (isMineClaim ? release(item.conversationId) : claim(item.conversationId))}
                      className={`${t.btnPrimary} px-2.5 py-1 text-xs`}
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {isMineClaim ? 'Отпустить' : 'Взять в работу'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className={`mb-1 font-body text-xs font-bold uppercase tracking-widest ${t.muted}`}>
        Telegram {tgItems.length > 0 && `(${tgItems.length})`}
      </h2>
      <p className={`mb-3 text-xs ${t.muted}`}>
        Анонимная переписка через бота — отвечать нужно в своём Telegram; «Взять в работу» закрепляет обращение за вами.
      </p>
      {tgItems.length === 0 ? (
        <div className={`${t.card} p-8 text-center text-sm ${t.muted}`}>Активных обращений нет</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tgItems.map((item) => {
            const isMineClaim = item.claimedBy?.userId === authUser?.id;
            const claimerName = item.claimedBy
              ? item.claimedBy.fullName?.trim() || item.claimedBy.login?.trim() || 'Сотрудник'
              : null;
            const isTgBusy = tgBusyId === item.threadId;
            const clientLabel = item.clientTelegramUsername ? `@${item.clientTelegramUsername}` : 'Клиент в Telegram';

            return (
              <div key={item.threadId} className={`${t.card} flex flex-col gap-3 p-4`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${L ? 'bg-[#f0f0f1]' : 'bg-white/[0.06]'}`}>
                    <Send className={`h-4 w-4 ${t.muted}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>
                        {item.model?.displayName ?? 'Анкета'}
                      </span>
                      {item.model && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${AVAILABILITY_DOT_COLOR[item.model.availabilityStatus]}`}
                          title={AVAILABILITY_CLIENT_LABEL[item.model.availabilityStatus]}
                        />
                      )}
                    </div>
                    <div className={`truncate text-xs ${t.muted}`}>{clientLabel}</div>
                    <div className={`mt-1 truncate text-xs ${t.muted}`}>{item.lastMessage?.content ?? 'Нет сообщений'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className={`text-xs ${t.muted}`}>
                    {item.claimedBy ? `В работе: ${isMineClaim ? 'вы' : claimerName}` : 'Свободно — ждёт ответа'}
                  </span>
                  {!item.claimedBy && (
                    <button type="button" disabled={isTgBusy} onClick={() => claimTelegram(item.threadId)} className={`${t.btnPrimary} px-2.5 py-1 text-xs`}>
                      {isTgBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Взять в работу
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default function TeamInboxPage() {
  return (
    <ProtectedRoute requiredRoles={['manager', 'employee']}>
      <TeamInboxPageInner />
    </ProtectedRoute>
  );
}

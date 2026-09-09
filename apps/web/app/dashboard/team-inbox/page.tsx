'use client';

/**
 * Модерация обращений — общий инбокс менеджера/сотрудника: все диалоги клиент↔модель
 * по анкетам их команды (см. MessagesService.getTeamInbox), с захватом диалога в работу.
 * Вынесено из бокового списка ChatPanel в отдельный раздел.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, MessageSquare, Send, Trash2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { api, type TelegramRelayThreadItem } from '@/lib/api-client';
import type { TeamInboxItem } from '@/types/chat';
import { AVAILABILITY_CLIENT_LABEL, AVAILABILITY_DOT_COLOR } from '@/lib/availability';

/** Единая высота для всех кнопок-действий в футере карточки (иконка-корзина и текстовые pill-кнопки). */
const ACTION_BTN = 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50';

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

  const removeConversation = async (conversationId: string, clientName: string) => {
    if (!window.confirm(`Удалить чат с «${clientName}»? Вся переписка будет стёрта безвозвратно.`)) return;
    setBusyId(conversationId);
    try {
      await api.deleteConversation(conversationId);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось удалить чат');
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

  const removeTelegramThread = async (threadId: string, clientLabel: string) => {
    if (!window.confirm(`Удалить Telegram-чат с «${clientLabel}»? Вся переписка будет стёрта безвозвратно.`)) return;
    setTgBusyId(threadId);
    try {
      await api.deleteTelegramThread(threadId);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось удалить чат');
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
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const clientName = item.client?.fullName?.trim() || item.client?.login?.trim() || 'Клиент';
            const isMineClaim = item.claimedBy?.userId === authUser?.id;
            const claimerName = item.claimedBy
              ? item.claimedBy.fullName?.trim() || item.claimedBy.login?.trim() || 'Сотрудник'
              : null;
            const isBusy = busyId === item.conversationId;

            return (
              <div
                key={item.conversationId}
                className={`${t.card} flex flex-col gap-3 p-4 transition-colors ${L ? 'hover:border-[#8c8f94]' : 'hover:border-white/[0.12]'}`}
              >
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

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <span className={`min-w-0 flex-1 truncate text-xs ${t.muted}`}>
                    {item.claimedBy ? `В работе: ${isMineClaim ? 'вы' : claimerName}` : 'Свободно'}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      title="Удалить чат"
                      onClick={() => removeConversation(item.conversationId, clientName)}
                      className={`${ACTION_BTN} w-8 border px-0 ${
                        L
                          ? 'border-[#d63638]/40 bg-[#fcf0f1] text-[#d63638] hover:bg-[#fad7d8]'
                          : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {item.claimedBy && !isMineClaim ? (
                      authUser?.role === 'manager' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => release(item.conversationId)}
                          className={`${ACTION_BTN} border px-3 ${L ? 'border-[#c3c4c7] bg-[#f6f7f7] text-[#2c3338] hover:bg-white hover:border-[#8c8f94]' : 'border-white/[0.1] bg-[#0a0a0a] text-gray-200 hover:border-white/[0.18] hover:bg-white/[0.04]'}`}
                        >
                          Освободить
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => (isMineClaim ? release(item.conversationId) : claim(item.conversationId))}
                        className={`${ACTION_BTN} px-3 ${L ? 'bg-[#2271b1] text-white hover:bg-[#135e96]' : 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-lg'}`}
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {isMineClaim ? 'Отпустить' : 'Взять в работу'}
                      </button>
                    )}
                  </div>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tgItems.map((item) => {
            const isMineClaim = item.claimedBy?.userId === authUser?.id;
            const claimerName = item.claimedBy
              ? item.claimedBy.fullName?.trim() || item.claimedBy.login?.trim() || 'Сотрудник'
              : null;
            const isTgBusy = tgBusyId === item.threadId;
            const clientLabel = item.clientTelegramUsername ? `@${item.clientTelegramUsername}` : 'Клиент в Telegram';

            return (
              <div
                key={item.threadId}
                className={`${t.card} flex flex-col gap-3 p-4 transition-colors ${L ? 'hover:border-[#8c8f94]' : 'hover:border-white/[0.12]'}`}
              >
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

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <span className={`min-w-0 flex-1 truncate text-xs ${t.muted}`}>
                    {item.claimedBy ? `В работе: ${isMineClaim ? 'вы' : claimerName}` : 'Свободно — ждёт ответа'}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isTgBusy}
                      title="Удалить чат"
                      onClick={() => removeTelegramThread(item.threadId, clientLabel)}
                      className={`${ACTION_BTN} w-8 border px-0 ${
                        L
                          ? 'border-[#d63638]/40 bg-[#fcf0f1] text-[#d63638] hover:bg-[#fad7d8]'
                          : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {!item.claimedBy && (
                      <button
                        type="button"
                        disabled={isTgBusy}
                        onClick={() => claimTelegram(item.threadId)}
                        className={`${ACTION_BTN} px-3 ${L ? 'bg-[#2271b1] text-white hover:bg-[#135e96]' : 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-lg'}`}
                      >
                        {isTgBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Взять в работу
                      </button>
                    )}
                  </div>
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

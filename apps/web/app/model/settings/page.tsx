'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { AlertCircle, Loader2, Check, ExternalLink, LinkIcon, Unlink } from 'lucide-react';

interface TelegramStatus {
  linked: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
}

export default function ModelSettingsPage() {
  const [tg, setTg] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // linking flow
  const [linking, setLinking] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // unlink
  const [unlinking, setUnlinking] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    api.getTelegramStatus()
      .then(setTg)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    return () => stopPolling();
  }, [stopPolling]);

  const startLinking = async () => {
    setLinking(true);
    setError(null);
    try {
      const { deepLink: dl } = await api.createTelegramLinkToken();
      setDeepLink(dl);
      setPolling(true);
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.getTelegramStatus();
          if (status.linked) {
            setTg(status);
            setDeepLink(null);
            stopPolling();
          }
        } catch {
          // ignore poll errors
        }
      }, 3000);
    } catch (e: any) {
      setError(e.message ?? 'Не удалось создать ссылку');
    } finally {
      setLinking(false);
    }
  };

  const cancelLinking = () => {
    setDeepLink(null);
    stopPolling();
  };

  const handleUnlink = async () => {
    if (!confirm('Отвязать Telegram? Уведомления перестанут приходить.')) return;
    setUnlinking(true);
    setError(null);
    try {
      await api.unlinkTelegram();
      setTg({ linked: false, telegramId: null, telegramUsername: null, telegramLinkedAt: null });
    } catch (e: any) {
      setError(e.message ?? 'Не удалось отвязать');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Настройки</h1>
        <p className="mt-1 font-body text-sm text-white/35">Управление уведомлениями и привязками.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
        </div>
      )}

      {/* Telegram section */}
      <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-5">
        <div className="flex items-center gap-3">
          {/* Telegram icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/10">
            <svg className="h-5 w-5 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white">Telegram</h2>
            <p className="font-body text-xs text-white/35">Уведомления о бронях, оплатах и новых клиентах</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 font-body text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Проверка статуса…
          </div>
        ) : tg?.linked ? (
          /* Linked state */
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="font-body text-sm font-medium text-emerald-300">
                  {tg.telegramUsername ? `@${tg.telegramUsername}` : `ID: ${tg.telegramId}`}
                </p>
                {tg.telegramLinkedAt && (
                  <p className="font-body text-xs text-white/25">
                    Привязан{' '}
                    {new Date(tg.telegramLinkedAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleUnlink}
              disabled={unlinking}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2 font-body text-sm text-white/40 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
            >
              {unlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
              Отвязать Telegram
            </button>
          </div>
        ) : deepLink ? (
          /* Linking in progress */
          <div className="space-y-4">
            <div className="rounded-xl border border-[#229ED9]/20 bg-[#229ED9]/5 p-4 text-center">
              <p className="font-body text-sm text-white/60">
                Нажмите кнопку ниже — бот привяжет аккаунт автоматически.
              </p>
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#229ED9] px-6 py-2.5 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть в Telegram
              </a>
            </div>
            <div className="flex items-center gap-2 font-body text-sm text-white/30">
              <Loader2 className="h-4 w-4 animate-spin text-[#229ED9]/50" />
              Ожидаем подтверждения от бота…
            </div>
            <button
              type="button"
              onClick={cancelLinking}
              className="font-body text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              Отмена
            </button>
          </div>
        ) : (
          /* Not linked */
          <div className="space-y-3">
            <p className="font-body text-sm text-white/40">
              Привяжите Telegram, чтобы получать уведомления о новых бронях, статусах оплаты и сообщениях от менеджера.
            </p>
            <button
              type="button"
              onClick={startLinking}
              disabled={linking}
              className="flex items-center gap-2 rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/10 px-5 py-2.5 font-body text-sm font-medium text-[#229ED9] transition-colors hover:bg-[#229ED9]/15 disabled:opacity-50"
            >
              {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              {linking ? 'Создаём ссылку…' : 'Привязать Telegram'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

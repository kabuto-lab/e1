'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Check, Loader2, ExternalLink, Copy, Unlink } from 'lucide-react';
import api from '@/lib/api-client';

type LinkToken = {
  token: string;
  expiresAt: string;
  deepLink: string | null;
};

type TelegramStatus = {
  linked: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
};

const POLL_INTERVAL_MS = 2500;

export default function CabinetSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Настройки</h1>
        <p className="mt-2 font-body text-sm text-white/40">
          Интеграции и личные предпочтения.
        </p>
      </div>

      <TelegramIntegrationCard />
    </div>
  );
}

function TelegramIntegrationCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [linkToken, setLinkToken] = useState<LinkToken | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.getTelegramStatus();
      setStatus(s);
      return s;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось получить статус Telegram');
      return null;
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollTimerRef.current = window.setInterval(async () => {
      const s = await loadStatus();
      if (s?.linked) {
        stopPolling();
        setLinkToken(null);
      }
    }, POLL_INTERVAL_MS);
  }, [loadStatus, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  const handleCreateToken = async () => {
    setCreatingToken(true);
    setError(null);
    try {
      const t = await api.createTelegramLinkToken();
      setLinkToken(t);
      if (t.deepLink) {
        window.open(t.deepLink, '_blank', 'noopener,noreferrer');
      }
      startPolling();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать токен');
    } finally {
      setCreatingToken(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm('Отвязать Telegram от аккаунта? Уведомления из бота перестанут приходить.')) {
      return;
    }
    setUnlinking(true);
    setError(null);
    try {
      await api.unlinkTelegram();
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отвязать Telegram');
    } finally {
      setUnlinking(false);
    }
  };

  const handleCopyToken = async () => {
    if (!linkToken) return;
    try {
      await navigator.clipboard.writeText(linkToken.token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Не удалось скопировать');
    }
  };

  const isLinked = status?.linked === true;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Telegram</h2>
            <p className="font-body text-xs text-white/40">
              Уведомления о бронях, подтверждениях и эскроу придут в бот.
            </p>
          </div>
        </div>

        {isLinked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 font-body text-xs font-medium text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            Привязано
          </span>
        ) : null}
      </header>

      {loadingStatus ? (
        <LoadingRow />
      ) : isLinked ? (
        <LinkedView status={status!} onUnlink={handleUnlink} unlinking={unlinking} />
      ) : linkToken ? (
        <WaitingView
          linkToken={linkToken}
          copied={copied}
          onCopy={handleCopyToken}
          onRecheck={loadStatus}
        />
      ) : (
        <UnlinkedView onLink={handleCreateToken} busy={creatingToken} />
      )}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 font-body text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 font-body text-sm text-white/40">
      <Loader2 className="h-4 w-4 animate-spin" />
      Проверяем статус…
    </div>
  );
}

function UnlinkedView({ onLink, busy }: { onLink: () => void; busy: boolean }) {
  return (
    <div className="space-y-3">
      <p className="font-body text-sm text-white/60">
        Telegram ещё не привязан. Нажми «Привязать» — откроется бот; после подтверждения в
        нём аккаунт свяжется автоматически.
      </p>
      <button
        type="button"
        onClick={onLink}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2.5 font-body text-sm font-medium text-black transition-colors hover:bg-[#c49a2b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Привязать Telegram
      </button>
    </div>
  );
}

function WaitingView({
  linkToken,
  copied,
  onCopy,
  onRecheck,
}: {
  linkToken: LinkToken;
  copied: boolean;
  onCopy: () => void;
  onRecheck: () => void;
}) {
  const expiresIn = useCountdown(linkToken.expiresAt);

  return (
    <div className="space-y-3">
      <p className="font-body text-sm text-white/60">
        {linkToken.deepLink ? (
          <>
            Мы открыли бот в новой вкладке. Нажми в нём «Start» — страница сама обновится. Ссылка
            действует {expiresIn}.
          </>
        ) : (
          <>
            Бот пока не сконфигурирован (нет <code className="text-[#d4af37]/80">TELEGRAM_BOT_USERNAME</code>).
            Отправь токен боту вручную через <code className="text-[#d4af37]/80">/start link_&lt;token&gt;</code> —
            кнопка «Копировать» ниже. Действует {expiresIn}.
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {linkToken.deepLink ? (
          <a
            href={linkToken.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-2 font-body text-sm font-medium text-[#d4af37] hover:bg-[#d4af37]/20"
          >
            <ExternalLink className="h-4 w-4" />
            Открыть бот снова
          </a>
        ) : null}

        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 font-body text-sm text-white/80 hover:border-white/20 hover:bg-white/[0.05]"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Скопировано' : 'Копировать токен'}
        </button>

        <button
          type="button"
          onClick={onRecheck}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 font-body text-sm text-white/70 hover:border-white/20 hover:bg-white/[0.05]"
        >
          Проверить сейчас
        </button>
      </div>

      <p className="flex items-center gap-2 font-body text-xs text-white/40">
        <Loader2 className="h-3 w-3 animate-spin" />
        Ожидаем подтверждения от бота…
      </p>
    </div>
  );
}

function LinkedView({
  status,
  onUnlink,
  unlinking,
}: {
  status: TelegramStatus;
  onUnlink: () => void;
  unlinking: boolean;
}) {
  const linkedAt = status.telegramLinkedAt ? new Date(status.telegramLinkedAt) : null;
  const atText = linkedAt
    ? linkedAt.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="space-y-2 font-body text-sm text-white/70">
      <div className="flex items-baseline gap-2">
        <span className="text-white/40">Аккаунт:</span>
        <span className="text-white">
          {status.telegramUsername ? `@${status.telegramUsername}` : 'без username'}
        </span>
      </div>
      {status.telegramId ? (
        <div className="flex items-baseline gap-2">
          <span className="text-white/40">ID:</span>
          <span className="font-mono text-xs text-white/70">{status.telegramId}</span>
        </div>
      ) : null}
      {atText ? (
        <div className="flex items-baseline gap-2">
          <span className="text-white/40">Привязан:</span>
          <span>{atText}</span>
        </div>
      ) : null}
      <div className="pt-3">
        <button
          type="button"
          onClick={onUnlink}
          disabled={unlinking}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 font-body text-sm text-white/70 transition-colors hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {unlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
          {unlinking ? 'Отвязываем…' : 'Отвязать Telegram'}
        </button>
      </div>
    </div>
  );
}

/** "через 4:32" (мин:сек) или "истекла". */
function useCountdown(isoTarget: string): string {
  const [text, setText] = useState(() => formatCountdown(isoTarget));

  useEffect(() => {
    const id = window.setInterval(() => setText(formatCountdown(isoTarget)), 1000);
    return () => window.clearInterval(id);
  }, [isoTarget]);

  return text;
}

function formatCountdown(isoTarget: string): string {
  const diffMs = new Date(isoTarget).getTime() - Date.now();
  if (diffMs <= 0) return 'истекла';
  const total = Math.floor(diffMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `ещё ${m}:${s.toString().padStart(2, '0')}`;
}

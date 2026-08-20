'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { LifeBuoy, ShieldCheck, UserRound } from 'lucide-react';
import api from '@/lib/api-client';
import { publicMediaUrl } from '@/lib/public-media-url';
import { useAuth } from '@/components/AuthProvider';
import { ChatMessage, MessagesConversation } from '@/types/chat';

function roleLabel(role: string) {
  const map: Record<string, string> = {
    client: 'Клиент',
    model: 'Модель',
    manager: 'Менеджер',
    admin: 'Админ',
  };
  return map[role] ?? role;
}

/** fullName → login → email prefix → @telegramUsername → роль.
 * Большинство аккаунтов (регистрация по логину, без fullName) отличаются друг от друга
 * только логином — без него все диалоги одной роли выглядели бы одинаково ("Клиент", "Модель"). */
function userDisplayName(
  fullName: string | null | undefined,
  login: string | null | undefined,
  email: string | null | undefined,
  telegramUsername: string | null | undefined,
  role: string,
) {
  if (fullName?.trim()) return fullName.trim();
  if (login?.trim()) return login.trim();
  if (email?.trim()) return email.trim().split('@')[0];
  if (telegramUsername?.trim()) return `@${telegramUsername.trim()}`;
  return roleLabel(role);
}

function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return formatTime(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function Avatar({
  name,
  photoUrl,
  size = 36,
  onClick,
  title,
}: {
  name: string | null | undefined;
  photoUrl?: string | null;
  size?: number;
  onClick?: () => void;
  title?: string;
}) {
  const [broken, setBroken] = useState(false);
  const clickableClass = onClick
    ? 'cursor-pointer ring-2 ring-transparent ring-offset-2 ring-offset-[#141414] transition-all hover:ring-[#D4AF37]/60 hover:scale-105'
    : '';
  const interactiveProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        title,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        },
      }
    : {};

  if (photoUrl && !broken) {
    return (
      <img
        src={publicMediaUrl(photoUrl)}
        alt=""
        className={`flex-shrink-0 rounded-full object-cover ${clickableClass}`}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
        {...interactiveProps}
      />
    );
  }
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 font-body font-semibold text-[#D4AF37] ${clickableClass}`}
      style={{ width: size, height: size, fontSize: size * 0.33 }}
      {...interactiveProps}
    >
      {initials(name)}
    </div>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

interface IProps {
  currentUserId: string;
}

export default function ChatPanel({ currentUserId }: IProps) {
  const { user: authUser } = useAuth();
  const [conversations, setConversations] = useState<MessagesConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; fullName: string | null; login: string | null; email: string | null; telegramUsername: string | null; role: string; avatarUrl: string | null }[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendWarning, setSendWarning] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [supportContacts, setSupportContacts] = useState<{ adminUserId: string | null; managerUserId: string | null } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken')?.replace(/^"|"$/g, '');
    if (!token) return;

    const explicitApi = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
    const rawBase = explicitApi || 'http://localhost:3000';
    // Extract just the origin (drop /api path if present) so socket.io uses namespace /messages
    const socketOrigin = (() => { try { return new URL(rawBase).origin; } catch { return rawBase; } })();

    const socket = io(`${socketOrigin}/messages`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setConversations((prev) =>
        prev
          .map((c) =>
            c.conversationId === msg.conversationId
              ? { ...c, lastMessage: { content: msg.content, senderId: msg.senderId, createdAt: msg.createdAt }, unread: msg.senderId !== currentUserId }
              : c,
          )
          .sort((a, b) => {
            const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return bt - at;
          }),
      );
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [currentUserId]);

  useEffect(() => {
    api.getConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authUser || authUser.role === 'admin' || authUser.role === 'moderator') return;
    api.getSupportContacts().then(setSupportContacts).catch(() => {});
  }, [authUser]);

  const openConversation = useCallback(
    async (convId: string) => {
      if (activeConvId && socketRef.current) {
        socketRef.current.emit('leave_conversation', { conversationId: activeConvId });
      }

      setActiveConvId(convId);
      setMessages([]);
      setLoadingMsgs(true);
      setMobileView('chat');
      setSendWarning(null);

      try {
        const history = await api.getMessages(convId);
        setMessages(history);
      } catch {
        // ignore
      } finally {
        setLoadingMsgs(false);
      }

      socketRef.current?.emit('join_conversation', { conversationId: convId });
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === convId ? { ...c, unread: false } : c)),
      );

      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [activeConvId],
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      if (!window.confirm('Удалить диалог? Вся переписка будет удалена безвозвратно.')) return;
      try {
        await api.deleteConversation(convId);
        setConversations((prev) => prev.filter((c) => c.conversationId !== convId));
        if (activeConvId === convId) {
          if (socketRef.current) socketRef.current.emit('leave_conversation', { conversationId: convId });
          setActiveConvId(null);
          setMessages([]);
          setMobileView('list');
        }
      } catch {
        // ignore
      }
    },
    [activeConvId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeConvId || sending) return;

    setSending(true);
    setInput('');
    setSendWarning(null);

    if (socketRef.current?.connected) {
      socketRef.current.emit(
        'send_message',
        { conversationId: activeConvId, content: text },
        (response: { ok?: boolean; error?: string }) => {
          if (response?.error) setSendWarning(response.error);
          setSending(false);
        },
      );
    } else {
      try {
        const saved = await api.getMessages(activeConvId);
        setMessages(saved);
      } catch {
        // ignore
      } finally {
        setSending(false);
      }
    }
  }, [input, activeConvId, sending]);

  const openNewDialog = async () => {
    if (allUsers.length === 0) {
      const users = await api.getMessagesUsers().catch(() => []);
      setAllUsers(users);
    }
    setShowNewDialog(true);
  };

  const startConversation = async (targetUserId: string) => {
    setShowNewDialog(false);
    try {
      const { conversationId } = await api.startConversation(targetUserId);
      const updated = await api.getConversations();
      setConversations(updated);
      openConversation(conversationId);
    } catch {
      // ignore
    }
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  const autoStartedRef = useRef(false);

  useEffect(() => {
    const targetUserId = searchParams.get('with');
    if (!targetUserId || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startConversation(targetUserId);
    router.replace(window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeConv = conversations.find((c) => c.conversationId === activeConvId);
  const modelSlug = activeConv?.interlocutor?.role === 'model' ? activeConv.interlocutor.modelSlug : null;
  const goToModelProfile = modelSlug ? () => router.push(`/models/${modelSlug}`) : null;

  return (
    <>
      <div className="flex h-[calc(100dvh-76px)] sm:h-[calc(100dvh-96px)] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111111]">

        {/* ── Sidebar (always visible on sm+; list-only on mobile) ── */}
        <div className={`flex-col border-r border-white/[0.06] ${mobileView === 'chat' ? 'hidden sm:flex' : 'flex'} w-full sm:w-64 flex-shrink-0`}>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <span className="font-display text-sm font-semibold text-white">Диалоги</span>
            <button
              onClick={openNewDialog}
              className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-[#D4AF37]"
              title="Новый диалог"
            >
              <IconPlus />
            </button>
          </div>

          {authUser && authUser.role !== 'admin' && authUser.role !== 'moderator' && (
            <div className="flex flex-col gap-0.5 border-b border-white/[0.06] px-2 py-2">
              <button
                type="button"
                onClick={() => router.push('/contacts')}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left font-body text-xs text-white/50 transition-colors hover:bg-white/[0.06] hover:text-[#D4AF37]"
              >
                <LifeBuoy className="h-3.5 w-3.5 shrink-0" />
                Помощь
              </button>
              {supportContacts?.adminUserId && (
                <button
                  type="button"
                  onClick={() => startConversation(supportContacts.adminUserId!)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left font-body text-xs text-white/50 transition-colors hover:bg-white/[0.06] hover:text-[#D4AF37]"
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Чат с администратором
                </button>
              )}
              {supportContacts?.managerUserId && (
                <button
                  type="button"
                  onClick={() => startConversation(supportContacts.managerUserId!)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left font-body text-xs text-white/50 transition-colors hover:bg-white/[0.06] hover:text-[#D4AF37]"
                >
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  Чат с менеджером
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="px-4 py-8 text-center font-body text-xs text-white/30">
                Нет активных диалогов.
                <br />
                Нажмите + чтобы начать.
              </div>
            )}
            {conversations.map((c) => {
              const name = userDisplayName(c.interlocutor?.fullName, c.interlocutor?.login, c.interlocutor?.email, c.interlocutor?.telegramUsername, c.interlocutor?.role ?? '');
              const isActive = c.conversationId === activeConvId;
              return (
                <button
                  key={c.conversationId}
                  onClick={() => openConversation(c.conversationId)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-[#D4AF37]/[0.08]' : 'hover:bg-white/[0.04]'}`}
                >
                  <Avatar name={name} photoUrl={c.interlocutor?.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`truncate font-body text-sm font-medium ${isActive ? 'text-[#D4AF37]' : 'text-white'}`}>
                        {name}
                      </span>
                      <span className="flex-shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-body text-[10px] text-white/35">
                        {roleLabel(c.interlocutor?.role ?? '')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-body text-xs text-white/30">
                        {c.lastMessage?.content ?? 'Нет сообщений'}
                      </span>
                      {c.lastMessage && (
                        <span className="flex-shrink-0 font-body text-[10px] text-white/25">
                          {formatDate(c.lastMessage.createdAt)}
                        </span>
                      )}
                      {c.unread && <span className="ml-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D4AF37]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat area (always visible on sm+; chat-only on mobile) ── */}
        <div className={`flex-col flex-1 ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>
          {!activeConvId ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-body text-sm text-white/20">Выберите диалог или начните новый</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                {/* Back button — mobile only */}
                <button
                  onClick={() => setMobileView('list')}
                  className="mr-1 rounded-lg p-1 text-white/40 transition-colors hover:text-white sm:hidden"
                  aria-label="Назад"
                >
                  <IconBack />
                </button>
                <Avatar
                  name={userDisplayName(activeConv?.interlocutor?.fullName, activeConv?.interlocutor?.login, activeConv?.interlocutor?.email, activeConv?.interlocutor?.telegramUsername, activeConv?.interlocutor?.role ?? '')}
                  photoUrl={activeConv?.interlocutor?.avatarUrl}
                  size={32}
                  title={goToModelProfile ? 'Открыть анкету' : undefined}
                  onClick={goToModelProfile ?? undefined}
                />
                <div>
                  <div
                    className={`font-body text-sm font-semibold text-white ${goToModelProfile ? 'cursor-pointer transition-colors hover:text-[#D4AF37]' : ''}`}
                    title={goToModelProfile ? 'Открыть анкету' : undefined}
                    role={goToModelProfile ? 'button' : undefined}
                    tabIndex={goToModelProfile ? 0 : undefined}
                    onClick={goToModelProfile ?? undefined}
                    onKeyDown={goToModelProfile ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToModelProfile(); } } : undefined}
                  >
                    {userDisplayName(activeConv?.interlocutor?.fullName, activeConv?.interlocutor?.login, activeConv?.interlocutor?.email, activeConv?.interlocutor?.telegramUsername, activeConv?.interlocutor?.role ?? '')}
                  </div>
                  <div className="font-body text-xs text-white/30">
                    {roleLabel(activeConv?.interlocutor?.role ?? '')}
                  </div>
                </div>
                <button
                  onClick={() => activeConvId && deleteConversation(activeConvId)}
                  className="ml-auto rounded-lg p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Удалить диалог"
                  aria-label="Удалить диалог"
                >
                  <IconTrash />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
                {loadingMsgs && (
                  <div className="py-8 text-center font-body text-xs text-white/20">Загрузка…</div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <div className="py-8 text-center font-body text-xs text-white/20">Начните переписку</div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`w-fit max-w-[300px] sm:max-w-[400px] rounded-2xl px-4 py-2.5 ${isMine ? 'rounded-br-sm bg-[#D4AF37]/[0.12] text-white' : 'rounded-bl-sm bg-white/[0.06] text-white'}`}>
                        {!isMine && (
                          <div className="mb-0.5 font-body text-[10px] font-medium text-[#D4AF37]/70">
                            {userDisplayName(activeConv?.interlocutor?.fullName, activeConv?.interlocutor?.login, activeConv?.interlocutor?.email, activeConv?.interlocutor?.telegramUsername, activeConv?.interlocutor?.role ?? '')}
                          </div>
                        )}
                        <p className="font-body text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                        <div className={`mt-0.5 font-body text-[10px] ${isMine ? 'text-right text-white/30' : 'text-white/25'}`}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/[0.06] px-4 py-3">
                {sendWarning && (
                  <div className="mb-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 font-body text-xs text-rose-300">
                    {sendWarning}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      maxLength={500}
                      onChange={(e) => { setInput(e.target.value); setSendWarning(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                      }}
                      placeholder="Написать сообщение…"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 font-body text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#D4AF37]/30"
                    />
                    {input.length > 400 && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-body text-[10px] ${input.length >= 500 ? 'text-rose-400' : 'text-white/30'}`}>
                        {500 - input.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending || input.length > 500}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-black transition-opacity hover:opacity-90 disabled:opacity-30"
                  >
                    <IconSend />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New conversation modal ── */}
      {showNewDialog && (() => {
        const q = userSearch.trim().toLowerCase();
        const filtered = q
          ? allUsers.filter((u) => {
              const name = userDisplayName(u.fullName, u.login, u.email, u.telegramUsername, u.role).toLowerCase();
              const email = (u.email ?? '').toLowerCase();
              const tg = (u.telegramUsername ?? '').toLowerCase();
              return name.includes(q) || email.includes(q) || tg.includes(q);
            })
          : allUsers;

        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            onClick={() => { setShowNewDialog(false); setUserSearch(''); }}
          >
            <div
              className="flex w-full flex-col rounded-t-2xl border border-white/[0.08] bg-[#141414] shadow-2xl sm:w-[480px] sm:rounded-2xl"
              style={{ maxHeight: 'min(560px, 85dvh)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <h3 className="font-display text-base font-semibold text-white">Новый диалог</h3>
                <button
                  onClick={() => { setShowNewDialog(false); setUserSearch(''); }}
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <IconClose />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 py-3">
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    autoFocus
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Поиск по имени или email…"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-4 font-body text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-[#D4AF37]/30"
                  />
                </div>
              </div>

              {/* User list */}
              <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
                {allUsers.length === 0 && (
                  <div className="py-8 text-center font-body text-xs text-white/30">Нет других пользователей</div>
                )}
                {allUsers.length > 0 && filtered.length === 0 && (
                  <div className="py-8 text-center font-body text-xs text-white/30">Ничего не найдено</div>
                )}
                {filtered.map((u) => {
                  const name = userDisplayName(u.fullName, u.login, u.email, u.telegramUsername, u.role);
                  return (
                    <button
                      key={u.id}
                      onClick={() => { startConversation(u.id); setUserSearch(''); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <Avatar name={name} photoUrl={u.avatarUrl} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-body text-sm font-medium text-white">{name}</span>
                          <span className="flex-shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 font-body text-[10px] text-white/40">
                            {roleLabel(u.role)}
                          </span>
                        </div>
                        {u.email && (
                          <div className="truncate font-body text-xs text-white/30">{u.email}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

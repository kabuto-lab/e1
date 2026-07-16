'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api, authFetch } from '@/lib/api-client';
import { apiUrl } from '@/lib/api-url';
import EditableInfoRow from '@/components/EditableInfoRow';
import {
  Loader2, AlertCircle, Calendar,
  CheckCircle2, Send, Settings, Trophy,
  Globe, Heart, ChevronRight, Pencil, Check, X,
  User as UserIcon, Phone, Mail, MessageCircle, Building2, Clock, XCircle,
} from 'lucide-react';

type Me = Awaited<ReturnType<typeof api.getMe>>;
type ClientProfile = Exclude<Awaited<ReturnType<typeof api.getMyClientProfile>>, null>;

interface ManagerProfile {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  telegramContact: string | null;
  reviewNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

// ── helpers ────────────────────────────────────────────────────────────────────

function initials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.replace(/[._-]/g, ' ').split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (local[0] ?? '?').toUpperCase();
}

function displayName(email: string): string {
  if (!email) return 'Аноним';
  const local = email.split('@')[0] ?? '';
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── config ─────────────────────────────────────────────────────────────────────

const SUBSCRIPTION_LABEL: Record<string, string> = {
  none: 'Базовый', basic: 'Basic', standard: 'Standard', premium: 'Premium',
};
const SUBSCRIPTION_CLASS: Record<string, string> = {
  none: 'border-white/10 bg-white/[0.04] text-white/40',
  basic: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  standard: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
  premium: 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]',
};

const VIP_LABEL: Record<string, string> = {
  standard: 'Стандарт', silver: 'Серебро', gold: 'Золото', platinum: 'Платина',
};
const VIP_CLASS: Record<string, string> = {
  standard: 'border-white/10 bg-white/[0.04] text-white/35',
  silver: 'border-slate-400/25 bg-slate-400/10 text-slate-300',
  gold: 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]',
  platinum: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
};

const PSYCHOTYPE_LABEL: Record<string, string> = {
  dominant: 'Доминантный', intellectual: 'Интеллектуал', playful: 'Игривый',
  romantic: 'Романтик', adventurous: 'Авантюрист', light: 'Лёгкий',
};
const PSYCHOTYPE_ICON: Record<string, string> = {
  dominant: '⚡', intellectual: '🧠', playful: '🎲',
  romantic: '🌹', adventurous: '🏔', light: '✨',
};

// ── sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="font-body text-xs text-white/30">{label}</p>
      <p className="font-display text-xl font-bold text-white">{value}</p>
      {sub && <p className="font-body text-[11px] text-white/20">{sub}</p>}
    </div>
  );
}

function Section({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/25" />
      <div className="min-w-0">
        <p className="font-body text-xs text-white/30">{label}</p>
        <p className="mt-0.5 truncate font-body text-sm text-white/80">{value}</p>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function CabinetProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMe()
      .then(async (meData) => {
        setMe(meData);
        if (meData.role === 'client') {
          setClientProfile(await api.getMyClientProfile());
        } else if (meData.role === 'manager') {
          const r = await authFetch(apiUrl('/managers/me'));
          setManagerProfile(r.ok ? await r.json() : null);
        }
      })
      .catch((e) => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  const startEditName = (currentName: string) => {
    setNameValue(currentName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameValue('');
  };

  const saveName = async () => {
    if (!me || nameSaving) return;
    setNameSaving(true);
    try {
      await api.updateMyProfile({ fullName: nameValue.trim() || undefined });
      setMe({ ...me, fullName: nameValue.trim() || null });
      setEditingName(false);
    } catch {
      // ignore
    } finally {
      setNameSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <p className="font-body text-sm text-red-300">{error ?? 'Ошибка загрузки'}</p>
      </div>
    );
  }

  // ── Менеджер ── (все поля контактов управляются здесь же, страница /dashboard/profile не нужна)
  if (me.role === 'manager') {
    const isPending = me.status === 'pending_verification';
    const isRejected = me.status === 'suspended' && !!managerProfile?.rejectedAt;
    const isActive = me.status === 'active';
    const mgrInitials = (managerProfile?.fullName ?? me.email ?? '?')
      .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';

    return (
      <div className="space-y-6">
        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#d4af37]/[0.06] blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 ring-1 ring-[#d4af37]/20">
              <span className="font-display text-2xl font-bold text-[#d4af37]">{mgrInitials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold text-white">{managerProfile?.fullName ?? '—'}</h1>
              {managerProfile?.companyName && (
                <p className="mt-0.5 font-body text-sm text-white/35">{managerProfile.companyName}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {isActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 font-body text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Одобрен
                  </span>
                )}
                {isPending && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-body text-xs font-semibold text-amber-400">
                    <Clock className="h-3 w-3" /> На проверке
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 font-body text-xs font-semibold text-rose-400">
                    <XCircle className="h-3 w-3" /> Отклонён
                  </span>
                )}
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-body text-xs font-semibold text-white/40">
                  Менеджер
                </span>
              </div>
            </div>
          </div>
          {managerProfile?.createdAt && (
            <p className="relative mt-4 flex items-center gap-1.5 font-body text-xs text-white/20">
              <Calendar className="h-3.5 w-3.5" />
              Заявка подана{' '}
              {new Date(managerProfile.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* ── Контакты ── */}
        <Section title="Контакты">
          <div className="space-y-3">
            <InfoRow icon={UserIcon} label="Логин" value={me.login || '-'} />
            <EditableInfoRow
              icon={Phone}
              label="Телефон"
              value={managerProfile?.phone ?? null}
              inputType="tel"
              placeholder="+79001234567"
              onSave={async (v) => {
                const updated = await api.updateMyManagerProfile({ phone: v });
                setManagerProfile((p) => (p ? { ...p, phone: updated.phone } : p));
              }}
            />
            <EditableInfoRow
              icon={Mail}
              label="Email"
              value={me.email || null}
              inputType="email"
              placeholder="your@email.com"
              onSave={async (v) => {
                await api.updateMyProfile({ email: v });
                setMe((m) => (m ? { ...m, email: v } : m));
              }}
            />
            <EditableInfoRow
              icon={Send}
              label="Telegram"
              value={managerProfile?.telegramContact ?? null}
              placeholder="@username"
              onSave={async (v) => {
                const updated = await api.updateMyManagerProfile({ telegramContact: v });
                setManagerProfile((p) => (p ? { ...p, telegramContact: updated.telegramContact } : p));
              }}
            />
            <InfoRow icon={MessageCircle} label="Whatsapp" value="-" />
            <EditableInfoRow
              icon={Building2}
              label="Компания / агентство"
              value={managerProfile?.companyName ?? null}
              placeholder="Elite Agency"
              onSave={async (v) => {
                const updated = await api.updateMyManagerProfile({ companyName: v });
                setManagerProfile((p) => (p ? { ...p, companyName: updated.companyName } : p));
              }}
            />
          </div>
        </Section>

        {/* ── Аккаунт ── */}
        {managerProfile?.approvedAt && (
          <Section title="Аккаунт">
            <div className="space-y-3">
              <InfoRow
                icon={CheckCircle2}
                label="Одобрен"
                value={new Date(managerProfile.approvedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
            </div>
          </Section>
        )}

        {/* ── Заметка / отказ ── */}
        {isRejected && managerProfile?.rejectionReason && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-5">
            <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-rose-400">Причина отклонения</h2>
            <p className="font-body text-sm text-rose-300">{managerProfile.rejectionReason}</p>
          </div>
        )}

        {managerProfile?.reviewNote && !isRejected && (
          <Section title="Заметка от команды">
            <p className="font-body text-sm text-white/70">{managerProfile.reviewNote}</p>
          </Section>
        )}
      </div>
    );
  }

  // ── Клиент (дефолт) ──
  const tier = me.subscriptionTier ?? 'none';
  const vip = clientProfile?.vipTier ?? 'standard';
  const name = me.fullName?.trim() || (me.email ? displayName(me.email) : 'Аноним');
  const avatarLetters = me.fullName?.trim()
    ? me.fullName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : (me.email ? initials(me.email) : '?');
  const cancellationRate = clientProfile?.cancellationRate ? Number(clientProfile.cancellationRate) : 0;
  const langs: string[] = clientProfile?.preferences?.languages ?? [];

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-6">
        {/* gold glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#d4af37]/[0.06] blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-5">
          {/* Avatar */}
          <div className="relative h-20 w-20 shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 ring-1 ring-[#d4af37]/20">
              <span className="font-display text-2xl font-bold text-[#d4af37]">{avatarLetters}</span>
            </div>
            {me.telegram.linked && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#229ED9] ring-2 ring-[#141414]">
                <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Name + badges */}
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex w-full max-w-xs items-center gap-1.5">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') cancelEditName();
                  }}
                  maxLength={100}
                  placeholder="Введите имя…"
                  className="min-w-0 flex-1 rounded-lg border border-[#d4af37]/30 bg-white/[0.04] px-3 py-1.5 font-body text-sm text-white outline-none placeholder:text-white/20 focus:border-[#d4af37]/50"
                />
                <button
                  onClick={saveName}
                  disabled={nameSaving}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#d4af37] text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {nameSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={cancelEditName}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 transition-colors hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-white">{name}</h1>
                <button
                  onClick={() => startEditName(me.fullName?.trim() ?? '')}
                  className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-white/30 transition-all hover:text-[#d4af37]"
                  title="Изменить имя"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            {me.email && (
              <p className="mt-0.5 font-body text-sm text-white/35">{me.email}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 font-body text-xs font-semibold ${SUBSCRIPTION_CLASS[tier]}`}>
                {SUBSCRIPTION_LABEL[tier] ?? tier}
              </span>
              {vip !== 'standard' && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-body text-xs font-semibold ${VIP_CLASS[vip]}`}>
                  <Trophy className="h-3 w-3" />
                  {VIP_LABEL[vip]}
                </span>
              )}
              {clientProfile?.blacklistStatus && clientProfile.blacklistStatus !== 'clear' && (
                <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 font-body text-xs font-semibold text-red-300">
                  {clientProfile.blacklistStatus === 'warning' ? '⚠ Предупреждение' : '🚫 Заблокирован'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Member since */}
        {clientProfile?.createdAt && (
          <p className="relative mt-4 flex items-center gap-1.5 font-body text-xs text-white/20">
            <Calendar className="h-3.5 w-3.5" />
            Участник с{' '}
            {new Date(clientProfile.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* ── Stats ── */}
      {clientProfile && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Встреч" value={clientProfile.totalBookings ?? 0} />
          <StatCard label="Успешных" value={clientProfile.successfulMeetings ?? 0} />
          <StatCard
            label="Рейтинг"
            value={clientProfile.trustScore && Number(clientProfile.trustScore) > 0
              ? `${(Number(clientProfile.trustScore) * 100).toFixed(0)}%`
              : '—'}
            sub={clientProfile.trustScore && Number(clientProfile.trustScore) > 0 ? 'доверия' : undefined}
          />
          <StatCard
            label="Отмены"
            value={cancellationRate > 0 ? `${(cancellationRate * 100).toFixed(0)}%` : '0%'}
          />
        </div>
      )}

      {/* ── Psychotype ── */}
      {clientProfile?.psychotype && (
        <Section title="Психотип">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{PSYCHOTYPE_ICON[clientProfile.psychotype] ?? '🎭'}</span>
            <div>
              <p className="font-display text-base font-bold text-white">
                {PSYCHOTYPE_LABEL[clientProfile.psychotype] ?? clientProfile.psychotype}
              </p>
              <p className="font-body text-xs text-white/30">Определяет подбор моделей в каталоге</p>
            </div>
          </div>
        </Section>
      )}

      {/* ── Preferences ── */}
      {(langs.length > 0 || clientProfile?.preferences?.temperament) && (
        <Section title="Предпочтения">
          <div className="space-y-3">
            {langs.length > 0 && (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
                <div>
                  <p className="font-body text-xs text-white/30">Языки</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {langs.map((l) => (
                      <span key={l} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-body text-xs text-white/60">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {clientProfile?.preferences?.temperament && (
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 shrink-0 text-white/25" />
                <div>
                  <p className="font-body text-xs text-white/30">Темперамент</p>
                  <p className="font-body text-sm text-white/70 capitalize">{clientProfile.preferences.temperament}</p>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Контакты ── */}
      <Section title="Контакты">
        <div className="space-y-3">
          <InfoRow icon={UserIcon} label="Логин" value={me.login || '-'} />
          <EditableInfoRow
            icon={Phone}
            label="Телефон"
            value={me.phone ?? null}
            inputType="tel"
            placeholder="+79001234567"
            onSave={async (v) => {
              await api.updateMyProfile({ phone: v });
              setMe({ ...me, phone: v || null });
            }}
          />
          <EditableInfoRow
            icon={Mail}
            label="Email"
            value={me.email ?? null}
            inputType="email"
            placeholder="your@email.com"
            onSave={async (v) => {
              await api.updateMyProfile({ email: v });
              setMe({ ...me, email: v });
            }}
          />
          <InfoRow icon={Send} label="Telegram" value={me.telegram.telegramUsername ? `@${me.telegram.telegramUsername}` : '-'} />
          <InfoRow icon={MessageCircle} label="Whatsapp" value="-" />
        </div>
      </Section>

      {/* ── Telegram ── */}
      <Section
        title="Telegram"
        action={
          <Link href="/cabinet/settings" className="flex items-center gap-1 font-body text-xs text-white/30 hover:text-white/60 transition-colors">
            <Settings className="h-3.5 w-3.5" />
            Управление
          </Link>
        }
      >
        {me.telegram.linked ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/10">
              <svg className="h-4 w-4 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-medium text-white">
                {me.telegram.telegramUsername ? `@${me.telegram.telegramUsername}` : `ID: ${me.telegram.telegramId}`}
              </p>
              {me.telegram.telegramLinkedAt && (
                <p className="font-body text-xs text-white/25">
                  Привязан {new Date(me.telegram.telegramLinkedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 font-body text-xs text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Привязан
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                <Send className="h-4 w-4 text-white/20" />
              </div>
              <p className="font-body text-sm text-white/40">Telegram не привязан</p>
            </div>
            <Link
              href="/cabinet/settings"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/10 px-4 py-2 font-body text-sm font-medium text-[#229ED9] transition-colors hover:bg-[#229ED9]/15"
            >
              Привязать
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </Section>

      {/* ── Subscription upgrade prompt ── */}
      {tier === 'none' && (
        <div className="rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.04] p-5">
          <div className="flex items-start gap-3">
            <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]/60" />
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-white/80">Откройте доступ к отзывам</p>
              <p className="mt-1 font-body text-xs text-white/35">
                Подписка Basic и выше — полные отзывы клиентов на каждой анкете модели.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

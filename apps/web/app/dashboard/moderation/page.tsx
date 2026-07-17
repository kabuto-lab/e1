'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, UserCheck, Phone, Send, Building2, RefreshCw, ChevronDown, ChevronUp, UserPlus, Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ModerationQueueBoard } from '@/components/ModerationQueueBoard';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api-client';

interface ManagerApplication {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  profile: {
    fullName: string;
    companyName: string | null;
    phone: string;
    telegramContact: string | null;
    profileCreatedAt: string;
  } | null;
}

function ManagerApplicationsSection({ L, t }: { L: boolean; t: ReturnType<typeof dashboardTone> }) {
  const [managers, setManagers] = useState<ManagerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getManagerApplications();
      setManagers(
        Array.isArray(data)
          ? (data as ManagerApplication[]).filter(m => m.status === 'pending_verification')
          : [],
      );
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try { await fn(); await load(); } finally { setBusyId(null); }
  };

  const pending = managers.length;

  return (
    <div className={`mb-6 overflow-hidden rounded-xl border ${L ? 'border-[#dcdcde] bg-white' : 'border-white/[0.06] bg-[#141414]'}`}>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(v => !v)}
        onKeyDown={e => e.key === 'Enter' && setCollapsed(v => !v)}
        className={`flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors ${
          L ? 'hover:bg-[#f6f7f7]' : 'hover:bg-white/[0.02]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            L ? 'bg-[#f0f6fc]' : 'bg-[#d4af37]/10'
          }`}>
            <UserCheck className={`h-4 w-4 ${L ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
          </div>
          <div className='flex items-center'>
            <span className={`font-display text-sm font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
              Заявки менеджеров
            </span>
            {!loading && (
              <span className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                pending > 0
                  ? L ? 'bg-amber-100 text-amber-700' : 'bg-amber-400/15 text-amber-400'
                  : L ? 'bg-[#f0f0f1] text-[#50575e]' : 'bg-white/10 text-gray-400'
              }`}>
                {pending}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); load(); }}
            className={`rounded p-1 transition-colors ${L ? 'text-[#646970] hover:text-[#1d2327]' : 'text-gray-500 hover:text-white'}`}
            title="Обновить"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {collapsed
            ? <ChevronDown className={`h-4 w-4 ${L ? 'text-[#646970]' : 'text-gray-500'}`} />
            : <ChevronUp className={`h-4 w-4 ${L ? 'text-[#646970]' : 'text-gray-500'}`} />
          }
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className={`border-t px-5 py-4 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
          {loading ? (
            <p className={`text-sm ${t.muted}`}>Загрузка…</p>
          ) : pending === 0 ? (
            <p className={`text-sm ${t.muted}`}>Нет новых заявок на роль менеджера.</p>
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
              {managers.map(m => (
                <div
                  key={m.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 ${
                    L ? 'border-[#dcdcde] bg-[#fafafa]' : 'border-white/[0.08] bg-black/20'
                  }`}
                >
                  {/* Name + email */}
                  <div>
                    <p className={`text-sm font-semibold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
                      {m.profile?.fullName ?? '—'}
                    </p>
                    <p className={`mt-0.5 truncate text-xs ${t.muted}`}>{m.email}</p>
                  </div>

                  {/* Details */}
                  <div className={`space-y-1.5 text-xs ${t.muted}`}>
                    {m.profile?.companyName && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{m.profile.companyName}</span>
                      </div>
                    )}
                    {m.profile?.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{m.profile.phone}</span>
                      </div>
                    )}
                    {m.profile?.telegramContact && (
                      <div className="flex items-center gap-1.5">
                        <Send className="h-3 w-3 shrink-0" />
                        <span>{m.profile.telegramContact}</span>
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <p className={`text-[10px] ${t.muted}`}>
                    {new Date(m.profile?.profileCreatedAt ?? m.createdAt).toLocaleString('ru-RU', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => run(m.id, () => api.approveManager(m.id))}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        L
                          ? 'border-[#00a32a]/40 bg-[#edfaef] text-[#00a32a] hover:bg-[#d1fadf]'
                          : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Одобрить
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => {
                        const reason = window.prompt('Причина отклонения (необязательно):') ?? '';
                        run(m.id, () => api.rejectManager(m.id, reason || undefined));
                      }}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        L
                          ? 'border-[#d63638]/40 bg-[#fcf0f1] text-[#d63638] hover:bg-[#fad7d8]'
                          : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ModeratorUser {
  id: string;
  login: string | null;
  status: string;
  createdAt: string;
}

function ModeratorsSection({ L, t }: { L: boolean; t: ReturnType<typeof dashboardTone> }) {
  const [collapsed, setCollapsed] = useState(true);
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.listUsers('moderator');
      setModerators(Array.isArray(data) ? (data as unknown as ModeratorUser[]) : []);
    } catch {
      setModerators([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.createUser({ login: login.trim(), password, role: 'moderator' });
      setLogin('');
      setPassword('');
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Не удалось создать пользователя');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: ModeratorUser) => {
    if (!window.confirm(`Удалить модератора «${m.login}»?`)) return;
    setDeletingId(m.id);
    try {
      await api.deleteUser(m.id);
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Не удалось удалить пользователя');
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
    L
      ? 'border-[#dcdcde] bg-white text-[#1d2327] focus:border-[#2271b1]'
      : 'border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 focus:border-[#d4af37]/50'
  }`;

  return (
    <div className={`mb-6 overflow-hidden rounded-xl border ${L ? 'border-[#dcdcde] bg-white' : 'border-white/[0.06] bg-[#141414]'}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(v => !v)}
        onKeyDown={e => e.key === 'Enter' && setCollapsed(v => !v)}
        className={`flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors ${
          L ? 'hover:bg-[#f6f7f7]' : 'hover:bg-white/[0.02]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${L ? 'bg-[#f0f6fc]' : 'bg-[#d4af37]/10'}`}>
            <UserPlus className={`h-4 w-4 ${L ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
          </div>
          <div className="flex items-center">
            <span className={`font-display text-sm font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
              Модераторы
            </span>
            {!loadingList && (
              <span className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                L ? 'bg-[#f0f0f1] text-[#50575e]' : 'bg-white/10 text-gray-400'
              }`}>
                {moderators.length}
              </span>
            )}
          </div>
        </div>
        {collapsed
          ? <ChevronDown className={`h-4 w-4 ${L ? 'text-[#646970]' : 'text-gray-500'}`} />
          : <ChevronUp className={`h-4 w-4 ${L ? 'text-[#646970]' : 'text-gray-500'}`} />
        }
      </div>

      {!collapsed && (
        <div className={`border-t px-5 py-4 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className={`mb-1 block text-xs font-medium ${t.muted}`}>Логин</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                placeholder="moderator_ivan"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs font-medium ${t.muted}`}>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                L
                  ? 'border-[#2271b1]/40 bg-[#f0f6fc] text-[#2271b1] hover:bg-[#dcedfa]'
                  : 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/15'
              }`}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Создать
            </button>
          </form>
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

          <div className="mt-5">
            {loadingList ? (
              <p className={`text-sm ${t.muted}`}>Загрузка…</p>
            ) : moderators.length === 0 ? (
              <p className={`text-sm ${t.muted}`}>Модераторов пока нет.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className={`border-b text-xs uppercase tracking-wide ${L ? 'border-[#dcdcde] text-[#646970]' : 'border-white/[0.06] text-gray-500'}`}>
                      <th className="py-2 pr-4 font-medium min-w-[200px]">Логин</th>
                      <th className="py-2 pr-4 font-medium min-w-[140px]">Статус</th>
                      <th className="py-2 pr-4 font-medium min-w-[100px]">Создан</th>
                      <th className="py-2 pr-4 font-medium min-w-[100px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {moderators.map((m) => (
                      <tr key={m.id} className={`border-b last:border-0 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
                        <td className={`py-2.5 pr-4 font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>{m.login ?? '—'}</td>
                        <td className={`py-2.5 pr-4 ${t.muted}`}>{m.status}</td>
                        <td className={`py-2.5 pr-4 ${t.muted}`}>
                          {new Date(m.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </td>
                        <td className="py-2.5 pr-0 text-right">
                          <button
                            type="button"
                            disabled={deletingId === m.id}
                            onClick={() => remove(m)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              L
                                ? 'border-[#d63638]/40 bg-[#fcf0f1] text-[#d63638] hover:bg-[#fad7d8]'
                                : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModerationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

  useEffect(() => {
    if (user?.role === 'manager') router.replace('/dashboard/models/list');
  }, [user, router]);

  return (
    <ProtectedRoute requiredRoles={['admin', 'moderator']}>
      <div className={`flex min-h-0 flex-1 flex-col ${t.page}`}>
        <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
              Модерация
            </h1>
            <p className={`mt-1 text-sm ${t.muted}`}>Верификация анкет, медиа, отзывы и заявки менеджеров.</p>
          </div>
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 text-sm font-medium ${t.link} shrink-0`}
          >
            <ArrowLeft className="h-4 w-4" />
            На панель
          </Link>
        </div>

        <ManagerApplicationsSection L={L} t={t} />
        <ModeratorsSection L={L} t={t} />

        <ModerationQueueBoard variant="page" className="min-h-0 flex-1" />
      </div>
    </ProtectedRoute>
  );
}

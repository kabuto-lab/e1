'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, AlertCircle, Trash2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import api from '@/lib/api-client';

type UserRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  telegramId?: string | null;
  telegramUsername?: string | null;
  telegramLinkedAt?: string | null;
  login?: string | null;
  recoveryCode?: string | null;
  initialPassword?: string | null;
};

const DELETABLE_ROLES = new Set(['manager', 'model']);
const ROLE_EDITABLE_ROLES = new Set(['client', 'moderator', 'admin']);
const ROLE_OPTIONS: { value: 'client' | 'moderator' | 'admin'; label: string }[] = [
  { value: 'client', label: 'client' },
  { value: 'moderator', label: 'moderator' },
  { value: 'admin', label: 'admin' },
];

export default function DashboardUsersPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.listUsers();
      setUsers(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (u: UserRow) => {
    const confirmed = window.confirm(
      `Удалить ${u.role === 'manager' ? 'менеджера' : 'модель'} «${u.login ?? u.email}»? Это действие необратимо.`,
    );
    if (!confirmed) return;

    setDeletingId(u.id);
    setError(null);
    try {
      await api.deleteUser(u.id);
      setUsers((prev) => prev.filter((row) => row.id !== u.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить пользователя');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRoleChange = async (u: UserRow, newRole: 'client' | 'moderator' | 'admin') => {
    if (newRole === u.role) return;
    const confirmed = window.confirm(
      `Сменить роль «${u.login ?? u.email}» с ${u.role} на ${newRole}?`,
    );
    if (!confirmed) return;

    setUpdatingRoleId(u.id);
    setError(null);
    try {
      await api.updateUserRole(u.id, newRole);
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, role: newRole } : row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сменить роль');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className={`flex min-h-0 flex-1 flex-col ${t.page}`}>
        <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={t.h1}>Пользователи</h1>
            <p className={`mt-1 text-sm ${t.muted}`}>
              {loading ? 'Загрузка…' : `${users.length} записей`}
            </p>
          </div>
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 text-sm font-medium ${t.link} shrink-0`}
          >
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
                  <th className={t.th}>Роль</th>
                  <th className={t.th}>Email / ID</th>
                  <th className={t.th}>Логин / Код восст.</th>
                  <th className={t.th}>Статус</th>
                  <th className={t.th}>
                    <span className="inline-flex items-center gap-1">
                      <Send className="h-3.5 w-3.5" /> Telegram
                    </span>
                  </th>
                  <th className={t.th}>Привязан</th>
                  <th className={t.th}>Создан</th>
                  <th className={t.th}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={t.tr}>
                    <td className={t.td}>
                      {ROLE_EDITABLE_ROLES.has(u.role) && u.id !== currentUser?.id ? (
                        <select
                          value={u.role}
                          disabled={updatingRoleId === u.id}
                          onChange={(e) => handleRoleChange(u, e.target.value as 'client' | 'moderator' | 'admin')}
                          className={`${t.select} !w-auto py-1 text-xs disabled:opacity-50`}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge role={u.role} L={L} />
                      )}
                    </td>
                    <td className={t.td}>
                      <div className="font-mono text-xs">{u.email}</div>
                      <div className={`font-mono text-[11px] ${t.muted}`}>{u.id.slice(0, 8)}…</div>
                    </td>
                    <td className={t.td}>
                      <div className="font-mono text-xs">{u.login ?? '—'}</div>
                      <div className={`font-mono text-[11px] ${t.muted}`}>{u.recoveryCode ?? '—'}</div>
                      {u.initialPassword ? (
                        <div className={`font-mono text-[11px] ${t.muted}`}>Пароль: {u.initialPassword}</div>
                      ) : null}
                    </td>
                    <td className={t.td}>
                      <StatusBadge status={u.status} L={L} />
                    </td>
                    <td className={t.td}>
                      {u.telegramUsername ? (
                        <span className="font-mono text-xs">@{u.telegramUsername}</span>
                      ) : u.telegramId ? (
                        <span className={`font-mono text-[11px] ${t.muted}`}>id {u.telegramId}</span>
                      ) : (
                        <span className={t.muted}>—</span>
                      )}
                    </td>
                    <td className={t.td}>
                      <span className={t.muted}>
                        {u.telegramLinkedAt ? new Date(u.telegramLinkedAt).toLocaleDateString('ru-RU') : '—'}
                      </span>
                    </td>
                    <td className={t.td}>
                      <span className={t.muted}>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</span>
                    </td>
                    <td className={t.td}>
                      {DELETABLE_ROLES.has(u.role) ? (
                        <button
                          type="button"
                          disabled={deletingId === u.id}
                          onClick={() => handleDelete(u)}
                          title="Удалить"
                          className={`inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
                            L
                              ? 'text-[#d63638] hover:bg-[#fcf0f1]'
                              : 'text-red-400 hover:bg-red-500/10'
                          }`}
                        >
                          {deletingId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} className={`py-8 text-center text-sm ${t.muted}`}>
                      Пока пусто
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function RoleBadge({ role, L }: { role: string; L: boolean }) {
  const paletteDark: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-300 border-red-500/30',
    manager: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    moderator: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    model: 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30',
    client: 'bg-white/[0.06] text-gray-300 border-white/[0.1]',
  };
  const paletteLight: Record<string, string> = {
    admin: 'bg-[#fcf0f1] text-[#d63638] border-[#d63638]/30',
    manager: 'bg-[#fef8ee] text-[#b26200] border-[#b26200]/30',
    moderator: 'bg-[#e8f0fc] text-[#2271b1] border-[#2271b1]/30',
    model: 'bg-[#f0f6fc] text-[#135e96] border-[#135e96]/30',
    client: 'bg-[#f0f0f1] text-[#50575e] border-[#8c8f94]/30',
  };
  const palette = L ? paletteLight : paletteDark;
  const cls = palette[role] ?? palette.client;
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status, L }: { status: string; L: boolean }) {
  const paletteDark: Record<string, string> = {
    active: 'bg-green-500/10 text-green-300 border-green-500/30',
    pending_verification: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    suspended: 'bg-red-500/10 text-red-300 border-red-500/30',
    blacklisted: 'bg-white text-black border-transparent',
  };
  const paletteLight: Record<string, string> = {
    active: 'bg-[#edfaef] text-[#00a32a] border-[#00a32a]/30',
    pending_verification: 'bg-[#fef8ee] text-[#b26200] border-[#b26200]/30',
    suspended: 'bg-[#fcf0f1] text-[#d63638] border-[#d63638]/30',
    blacklisted: 'bg-[#1d2327] text-white border-transparent',
  };
  const palette = L ? paletteLight : paletteDark;
  const cls = palette[status] ?? (L ? 'bg-[#f0f0f1] text-[#50575e] border-[#8c8f94]/30' : 'bg-white/[0.06] text-gray-300 border-white/[0.1]');
  return <span className={`inline-block rounded border px-2 py-0.5 text-[11px] ${cls}`}>{status}</span>;
}

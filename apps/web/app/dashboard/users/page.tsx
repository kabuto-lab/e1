'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, AlertCircle, Trash2, Ban, ShieldCheck, Check } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { SelectDropdown } from '@/components/SelectDropdown';
import { NumberStepperInput } from '@/components/NumberStepperInput';
import api, { type BlacklistReason, type Profile } from '@/lib/api-client';

const BLOCKABLE_ROLES = new Set(['client', 'model', 'manager']);

const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  pending_verification: 'Ожидает проверки',
  suspended: 'Приостановлен',
  blacklisted: 'Заблокирован',
};

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

const OWNER_ROLE_LABEL: Record<string, string> = {
  admin: 'Админ',
  manager: 'Менеджер',
  moderator: 'Модератор',
  client: 'Клиент',
};

/**
 * Дефолт доли владельца, когда managerCommissionRate не задана явно (не то же самое, что
 * explicit 0%) — должен совпадать с DEFAULT_OWNER_COMMISSION_RATE в bookings.service.ts,
 * иначе степпер будет показывать не то значение, которое реально применится при завершении брони.
 */
const DEFAULT_OWNER_COMMISSION_PERCENT: Record<string, number> = {
  admin: 90,
  manager: 50,
};

/** Строка нижней таблицы «Модели по владельцам»: заголовок группы либо модель (с долей). */
type ShareRow =
  | { kind: 'group'; label: string }
  | { kind: 'model'; model: Profile; user?: UserRow; ownerRole?: string };

export default function DashboardUsersPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [modelProfiles, setModelProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<UserRow | null>(null);
  const [blockReason, setBlockReason] = useState<BlacklistReason>('client_complaints');
  const [blockDescription, setBlockDescription] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator';
  // Полный список пользователей теперь доступен и admin, и moderator (GET /users);
  // moderator лишь не может назначать роль admin и трогать существующие admin-аккаунты
  // (проверяется на бэке в PATCH /users/:id/role — см. users.controller.ts).
  const canManageUsers = isAdmin || isModerator;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const modelRows = await api.getMyModels(500);
      setModelProfiles(modelRows);
      if (canManageUsers) {
        setUsers(await api.listUsers(undefined, 1000));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    load();
  }, [load]);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const handleShareSaved = (modelId: string, rate: string | null) => {
    setModelProfiles((prev) => prev.map((m) => (m.id === modelId ? { ...m, managerCommissionRate: rate } : m)));
  };

  // Основная таблица — плоский список без role=model (модели показаны отдельно,
  // сгруппированными по владельцу, в таблице «Модели по владельцам» ниже).
  const mainRows = useMemo(() => users.filter((u) => u.role !== 'model'), [users]);

  // Отдельная таблица «Модели по владельцам»: владелец модели (managerId — не всегда
  // реальный manager, встречается и admin) → его модели с полем доли. Модели без владельца
  // или с managerId на несуществующего/невидимого пользователя — под «Без менеджера».
  const shareRows = useMemo<ShareRow[]>(() => {
    const modelsByOwner = new Map<string, Profile[]>();
    const unmanaged: Profile[] = [];
    for (const p of modelProfiles) {
      if (p.managerId && usersById.has(p.managerId)) {
        const arr = modelsByOwner.get(p.managerId) ?? [];
        arr.push(p);
        modelsByOwner.set(p.managerId, arr);
      } else {
        unmanaged.push(p);
      }
    }

    const result: ShareRow[] = [];

    if (unmanaged.length > 0) {
      result.push({ kind: 'group', label: 'Без менеджера' });
      for (const p of unmanaged) result.push({ kind: 'model', model: p, user: usersById.get(p.userId) });
    }

    for (const u of users) {
      if (u.role === 'model') continue; // модель не может владеть моделью
      const owned = modelsByOwner.get(u.id) ?? [];
      if (owned.length === 0) continue;
      const roleLabel = OWNER_ROLE_LABEL[u.role] ?? u.role;
      result.push({ kind: 'group', label: `${roleLabel}: ${u.login ?? u.email}` });
      for (const p of owned) result.push({ kind: 'model', model: p, user: usersById.get(p.userId), ownerRole: u.role });
    }

    return result;
  }, [users, modelProfiles, usersById]);

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

  const openBlockModal = (u: UserRow) => {
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
      setUsers((prev) => prev.map((row) => (row.id === blockTarget.id ? { ...row, status: 'blacklisted' } : row)));
      setBlockTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось заблокировать пользователя');
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleUnblock = async (u: UserRow) => {
    if (!window.confirm(`Разблокировать «${u.login ?? u.email}»?`)) return;
    setUnblockingId(u.id);
    setError(null);
    try {
      await api.blacklistRestore(u.role as 'client' | 'model' | 'manager', u.id);
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, status: 'active' } : row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось разблокировать пользователя');
    } finally {
      setUnblockingId(null);
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
    <ProtectedRoute requiredRoles={['admin', 'moderator']}>
      <div className={`flex min-h-0 flex-1 flex-col ${t.page}`}>
        <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={t.h1}>Пользователи</h1>
            {canManageUsers && (
              <p className={`mt-1 text-sm ${t.muted}`}>
                {loading ? 'Загрузка…' : `${users.length} записей`}
              </p>
            )}
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
                {mainRows.map((u) => {
                  return (
                    <tr key={u.id} className={t.tr}>
                      <td className={t.td}>
                        {ROLE_EDITABLE_ROLES.has(u.role) && u.id !== currentUser?.id && !(isModerator && u.role === 'admin') ? (
                          <div className={`w-32 ${updatingRoleId === u.id ? 'pointer-events-none opacity-50' : ''}`}>
                            <SelectDropdown
                              value={u.role}
                              onChange={(v) => handleRoleChange(u, v as 'client' | 'moderator' | 'admin')}
                              light={L}
                              options={isModerator ? ROLE_OPTIONS.filter((o) => o.value !== 'admin') : ROLE_OPTIONS}
                            />
                          </div>
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
                        <div className="flex items-center gap-1">
                          {BLOCKABLE_ROLES.has(u.role) ? (
                            u.status === 'blacklisted' ? (
                              <button
                                type="button"
                                disabled={unblockingId === u.id}
                                onClick={() => handleUnblock(u)}
                                title="Разблокировать"
                                className={`inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
                                  L ? 'text-[#00a32a] hover:bg-[#edfaef]' : 'text-green-400 hover:bg-green-500/10'
                                }`}
                              >
                                {unblockingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                              </button>
                            ) : (
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
                            )
                          ) : null}
                          {DELETABLE_ROLES.has(u.role) ? (
                            <button
                              type="button"
                              disabled={deletingId === u.id}
                              onClick={() => handleDelete(u)}
                              title="Удалить"
                              className={`inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
                                L ? 'text-[#d63638] hover:bg-[#fcf0f1]' : 'text-red-400 hover:bg-red-500/10'
                              }`}
                            >
                              {deletingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {mainRows.length === 0 && !loading ? (
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

        {!loading && shareRows.length > 0 && (
          <div className="mt-8">
            <h2 className={`mb-1 ${t.h2}`}>Модели по владельцам</h2>
            <p className={`mb-4 text-sm ${t.muted}`}>
              Доля менеджера от 95%-пула (после комиссии площадки) при завершении встречи.
            </p>
            <div className={t.tableWrap}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className={t.th}>Роль</th>
                    <th className={t.th}>Модель</th>
                    <th className={t.th}>Логин / Код восст.</th>
                    <th className={t.th}>Статус</th>
                    <th className={t.th}>
                      <span className="inline-flex items-center gap-1">
                        <Send className="h-3.5 w-3.5" /> Telegram
                      </span>
                    </th>
                    <th className={t.th}>Создан</th>
                    <th className={t.th}>Доля</th>
                    <th className={t.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {shareRows.map((row, idx) => {
                    if (row.kind === 'group') {
                      return (
                        <tr key={`group-${idx}`}>
                          <td colSpan={8} className={`${t.td} font-semibold ${L ? 'bg-[#f6f7f7]' : 'bg-white/[0.03]'}`}>
                            {row.label}
                          </td>
                        </tr>
                      );
                    }

                    const { model, user, ownerRole } = row;
                    return (
                      <tr key={`model-${model.id}`} className={t.tr}>
                        <td className={t.td}>
                          <RoleBadge role="model" L={L} />
                        </td>
                        <td className={`${t.td} pl-6`}>
                          <div className="text-xs">{model.displayName}</div>
                          {user?.email && <div className={`font-mono text-[11px] ${t.muted}`}>{user.email}</div>}
                        </td>
                        <td className={t.td}>
                          <div className="font-mono text-xs">{user?.login ?? '—'}</div>
                          <div className={`font-mono text-[11px] ${t.muted}`}>{user?.recoveryCode ?? '—'}</div>
                          {user?.initialPassword ? (
                            <div className={`font-mono text-[11px] ${t.muted}`}>Пароль: {user.initialPassword}</div>
                          ) : null}
                        </td>
                        <td className={t.td}>{user ? <StatusBadge status={user.status} L={L} /> : <span className={t.muted}>—</span>}</td>
                        <td className={t.td}>
                          {user?.telegramUsername ? (
                            <span className="font-mono text-xs">@{user.telegramUsername}</span>
                          ) : (
                            <span className={t.muted}>—</span>
                          )}
                        </td>
                        <td className={t.td}>
                          <span className={t.muted}>{new Date(model.createdAt).toLocaleDateString('ru-RU')}</span>
                        </td>
                        <td className={t.td}>
                          <ShareInput model={model} ownerRole={ownerRole} onSaved={handleShareSaved} light={L} />
                        </td>
                        <td className={t.td}>
                          {user && canManageUsers ? (
                            <div className="flex items-center gap-1">
                              {user.status === 'blacklisted' ? (
                                <button
                                  type="button"
                                  disabled={unblockingId === user.id}
                                  onClick={() => handleUnblock(user)}
                                  title="Разблокировать"
                                  className={`inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
                                    L ? 'text-[#00a32a] hover:bg-[#edfaef]' : 'text-green-400 hover:bg-green-500/10'
                                  }`}
                                >
                                  {unblockingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openBlockModal(user)}
                                  title="Заблокировать"
                                  className={`inline-flex items-center justify-center rounded p-1.5 transition-colors ${
                                    L ? 'text-[#d63638] hover:bg-[#fcf0f1]' : 'text-red-400 hover:bg-red-500/10'
                                  }`}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={deletingId === user.id}
                                onClick={() => handleDelete(user)}
                                title="Удалить"
                                className={`inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50 ${
                                  L ? 'text-[#d63638] hover:bg-[#fcf0f1]' : 'text-red-400 hover:bg-red-500/10'
                                }`}
                              >
                                {deletingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              <SelectDropdown
                value={blockReason}
                onChange={(v) => setBlockReason(v as BlacklistReason)}
                light={L}
                options={REASON_OPTIONS}
              />
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

function ShareInput({
  model,
  ownerRole,
  onSaved,
  light,
}: {
  model: Profile;
  ownerRole?: string;
  onSaved: (modelId: string, rate: string | null) => void;
  light: boolean;
}) {
  // Ставка не задана явно (NULL, не explicit 0%) — показываем тот же дефолт по роли
  // владельца, что реально применится на бэке при завершении брони (см. bookings.service.ts).
  const initialPercent =
    model.managerCommissionRate != null
      ? Math.round(Number(model.managerCommissionRate) * 100)
      : (ownerRole && DEFAULT_OWNER_COMMISSION_PERCENT[ownerRole]) || 0;
  const [percent, setPercent] = useState(initialPercent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (nextPercent: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (nextPercent === initialPercent) return;
      setSaving(true);
      setSaved(false);
      try {
        const updated = await api.updateModelManagerShare(model.id, nextPercent);
        onSaved(model.id, updated.managerCommissionRate);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Не удалось сохранить долю');
      } finally {
        setSaving(false);
      }
    }, 500);
  };

  const handleChange = (v: number) => {
    setPercent(v);
    save(v);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-24">
        <NumberStepperInput value={percent} onChange={handleChange} min={0} max={100} step={5} light={light} />
      </div>
      {saving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white/40" />}
      {saved && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
    </div>
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
    blacklisted: 'bg-red-950 text-red-200 border-red-800',
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

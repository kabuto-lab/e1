'use client';

/**
 * Сотрудники менеджера — фиксированный набор возможностей (чаты, статусы,
 * расписание анкет этого менеджера). Аккаунт создаёт сам менеджер.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, UserCheck, Settings2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { Switch } from '@/components/Switch';
import { api, type EmployeeRow } from '@/lib/api-client';

const PERMISSIONS: { key: 'canManagePayouts' | 'canEditModels'; label: string; description: string }[] = [
  { key: 'canManagePayouts', label: 'Выплаты', description: 'Видеть и обрабатывать заявки на вывод по моделям — так же, как может сам менеджер.' },
  { key: 'canEditModels', label: 'Редактирование анкет', description: 'Менять био, расценки и контакты анкеты. Публикация/скрытие анкеты остаётся только за менеджером.' },
];

const LOGIN_RE = /^[a-zA-Z0-9_.]{3,32}$/;
const PASSWORD_RE = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

function EmployeesPageInner() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const { user } = useAuth();
  const isPending = user?.status === 'pending_verification';

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [permissionsTarget, setPermissionsTarget] = useState<EmployeeRow | null>(null);
  const [permissionsDraft, setPermissionsDraft] = useState<{ canManagePayouts: boolean; canEditModels: boolean } | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmployees(await api.getEmployees());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить список');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    setFormError(null);
    if (!LOGIN_RE.test(login)) {
      setFormError('Логин: 3-32 символа, латиница/цифры/"_"/"."');
      return;
    }
    if (!PASSWORD_RE.test(password)) {
      setFormError('Пароль: минимум 8 символов, буквы и цифры');
      return;
    }
    setCreating(true);
    try {
      await api.createEmployee({ login, password, fullName: fullName.trim() || undefined });
      setLogin('');
      setPassword('');
      setFullName('');
      setFormOpen(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Не удалось создать сотрудника');
    } finally {
      setCreating(false);
    }
  };

  const openPermissions = (row: EmployeeRow) => {
    setPermissionsTarget(row);
    setPermissionsDraft({ canManagePayouts: row.canManagePayouts, canEditModels: row.canEditModels });
    requestAnimationFrame(() => setSheetVisible(true));
  };

  const closePermissions = () => {
    setSheetVisible(false);
    setTimeout(() => {
      setPermissionsTarget(null);
      setPermissionsDraft(null);
    }, 300);
  };

  const savePermissions = async () => {
    if (!permissionsTarget || !permissionsDraft) return;
    setSavingPermissions(true);
    try {
      const updated = await api.updateEmployeePermissions(permissionsTarget.userId, permissionsDraft);
      setEmployees((prev) => prev.map((e) => (e.userId === updated.userId ? updated : e)));
      closePermissions();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось изменить доступ');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDelete = async (row: EmployeeRow) => {
    if (!window.confirm(`Удалить сотрудника «${row.login ?? row.fullName}»? Это действие необратимо.`)) return;
    setDeletingId(row.userId);
    try {
      await api.deleteEmployee(row.userId);
      setEmployees((prev) => prev.filter((e) => e.userId !== row.userId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Не удалось удалить сотрудника');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`flex-1 font-body ${t.page}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
            Сотрудники
          </h1>
          <p className={`mt-1 text-sm ${t.muted}`}>
            Чаты, статусы и расписание — доступны всегда. Выплаты и редактирование анкет — включайте по необходимости.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          title={isPending ? 'Доступно после одобрения заявки' : undefined}
          onClick={() => setFormOpen((v) => !v)}
          className={`${t.btnPrimary} px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Plus className="h-4 w-4" /> Добавить сотрудника
        </button>
      </div>

      {isPending && (
        <div className={`${t.noticeInfo} mb-4`}>Аккаунт на проверке — добавление сотрудников будет доступно после одобрения заявки.</div>
      )}

      {formOpen && !isPending && (
        <div className={`${t.card} mb-6 p-5`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={`mb-1 block text-[10px] font-medium uppercase ${t.muted}`}>Логин</label>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="employee_login"
                className={t.input}
              />
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-medium uppercase ${t.muted}`}>Пароль</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 8 символов"
                className={t.input}
              />
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-medium uppercase ${t.muted}`}>Имя (необязательно)</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Как к нему обращаться"
                className={t.input}
              />
            </div>
          </div>
          {formError && <div className={`${t.noticeErr} mt-3`}>{formError}</div>}
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={creating} onClick={handleCreate} className={`${t.btnPrimary} px-4 py-2 text-sm`}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Создать
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className={`${t.btnSecondary} px-4 py-2 text-sm`}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {error && <div className={`${t.noticeErr} mb-4`}>{error}</div>}

      {loading ? (
        <div className={`flex items-center gap-2 text-sm ${t.muted}`}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : employees.length === 0 ? (
        <div className={`${t.card} p-8 text-center text-sm ${t.muted}`}>Сотрудников пока нет</div>
      ) : (
        <div className={t.tableWrap}>
          <table className="w-full min-w-[990px]">
            <thead>
              <tr>
                <th className={`${t.th} min-w-[150px]`}>Логин</th>
                <th className={`${t.th} min-w-[150px]`}>Пароль</th>
                <th className={`${t.th} min-w-[160px]`}>Имя</th>
                <th className={`${t.th} min-w-[150px]`}>Создан</th>
                <th className={`${t.th} min-w-[160px]`}>Доступы</th>
                <th className={`${t.th} min-w-[220px]`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.userId} className={t.tr}>
                  <td className={`${t.td} min-w-[150px] font-mono text-xs`}>{emp.login ?? '—'}</td>
                  <td className={`${t.td} min-w-[150px] font-mono text-xs`}>{emp.initialPassword ?? '—'}</td>
                  <td className={`${t.td} min-w-[160px]`}>{emp.fullName ?? '—'}</td>
                  <td className={`${t.td} min-w-[150px]`}>{new Date(emp.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td className={`${t.td} min-w-[160px]`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {PERMISSIONS.filter((p) => emp[p.key]).length === 0 ? (
                        <span className={`text-xs ${t.muted}`}>Только базовые</span>
                      ) : (
                        PERMISSIONS.filter((p) => emp[p.key]).map((p) => (
                          <span
                            key={p.key}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              L ? 'bg-[#edfaef] text-[#00a32a]' : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {p.label}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className={`${t.td} min-w-[220px]`}>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => openPermissions(emp)}
                        className={`${t.btnSecondary} px-2.5 py-1 text-xs`}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Настроить доступ
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === emp.userId}
                        onClick={() => handleDelete(emp)}
                        className={`${t.btnDanger} px-2.5 py-1 text-xs`}
                      >
                        {deletingId === emp.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {permissionsTarget && permissionsDraft ? (
        <>
          <div
            className={`fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closePermissions}
            aria-hidden
          />
          <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4" onClick={closePermissions}>
            <div
              className={`w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[1.5rem] border-t ${
                L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.08] bg-[#141414]'
              } pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-out sm:max-h-[85vh] sm:rounded-2xl sm:border sm:pb-6 sm:transition-none max-h-[88dvh] max-[640px]:max-w-full ${
                sheetVisible ? 'translate-y-0' : 'translate-y-full'
              } sm:translate-y-0`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`mx-auto mb-1 mt-3 h-1 w-10 rounded-full sm:hidden ${L ? 'bg-black/10' : 'bg-white/15'}`} />
              <div className="p-6 sm:pb-0">
                <h2 className={t.h2}>Доступ — «{permissionsTarget.login ?? permissionsTarget.fullName}»</h2>
                <p className={`mt-1 text-sm ${t.muted}`}>
                  Чаты, статусы и расписание доступны всегда. Ниже — дополнительные права сверх базового набора.
                </p>

                <div className="mt-5 space-y-4">
                  {PERMISSIONS.map((p) => (
                    <div key={p.key} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${L ? 'text-[#1d2327]' : 'text-white'}`}>{p.label}</p>
                        <p className={`mt-0.5 text-xs ${t.muted}`}>{p.description}</p>
                      </div>
                      <Switch
                        checked={permissionsDraft[p.key]}
                        onChange={(checked) => setPermissionsDraft((prev) => (prev ? { ...prev, [p.key]: checked } : prev))}
                        light={L}
                        ariaLabel={p.label}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className={t.btnSecondary} onClick={closePermissions} disabled={savingPermissions}>
                    Отмена
                  </button>
                  <button type="button" className={t.btnPrimary} onClick={savePermissions} disabled={savingPermissions}>
                    {savingPermissions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <ProtectedRoute requiredRoles={['manager']}>
      <EmployeesPageInner />
    </ProtectedRoute>
  );
}

'use client';

/**
 * /admin/employees — «Сотрудники»: таблица пользователей тенанта с чекбоксами
 * прав (tenant_users.permissions). Только tenant-admin. Чекбокс правится
 * оптимистично + PATCH /v1/employees/:id.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  employeesApi,
  PERMISSION_KEYS,
  ROLE_LABEL,
  STATUS_LABEL,
  type Employee,
} from '@/lib/employees-api';

export default function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setRows(await employeesApi.list());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggle(emp: Employee, key: string) {
    const next = { ...emp.permissions, [key]: !emp.permissions[key] };
    // оптимистично
    setRows((prev) => prev.map((r) => (r.id === emp.id ? { ...r, permissions: next } : r)));
    setSavingId(emp.id);
    try {
      const updated = await employeesApi.update(emp.id, { permissions: next });
      setRows((prev) => prev.map((r) => (r.id === emp.id ? updated : r)));
    } catch (err) {
      // откат
      setRows((prev) => prev.map((r) => (r.id === emp.id ? emp : r)));
      setError(String(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-medium tracking-[-.01em] text-text m-0">
          Сотрудники <span className="text-text-mute font-light">· права доступа</span>
        </h1>
        <span className="font-mono text-[11px] text-text-mute tracking-[.1em] uppercase">
          {loading ? '…' : `${rows.length} чел.`}
        </span>
      </div>

      {error && (
        <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-text-mute font-mono text-xs">loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-text-mute text-sm">Сотрудников нет.</div>
      ) : (
        <div className="overflow-x-auto border border-line rounded-xl bg-surface">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-text-mute">
                <th className="text-left font-medium px-3.5 py-2.5 sticky left-0 bg-surface">Сотрудник</th>
                <th className="text-left font-medium px-3 py-2.5 whitespace-nowrap">Роль</th>
                <th className="text-left font-medium px-3 py-2.5 whitespace-nowrap">Статус</th>
                {PERMISSION_KEYS.map((p) => (
                  <th key={p.key} className="font-medium px-2 py-2.5 text-center whitespace-nowrap">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((emp) => {
                const isAdmin = emp.role === 'tenant-admin';
                return (
                  <tr key={emp.id} className="border-b border-line/60 hover:bg-bg/30">
                    <td className="px-3.5 py-2.5 sticky left-0 bg-surface">
                      <div className="text-text font-medium">{emp.name}</div>
                      <div className="text-[11px] text-text-mute font-mono">{emp.email}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-dim">{ROLE_LABEL[emp.role]}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-dim">{STATUS_LABEL[emp.status]}</td>
                    {PERMISSION_KEYS.map((p) => {
                      const checked = isAdmin || !!emp.permissions[p.key];
                      return (
                        <td key={p.key} className="px-2 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isAdmin || savingId === emp.id}
                            title={isAdmin ? 'Админ салона имеет все права' : undefined}
                            onChange={() => toggle(emp, p.key)}
                            className="w-4 h-4 accent-gold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-text-mute">
        Админ салона обладает всеми правами по умолчанию. Права хранятся в
        профиле сотрудника; разграничение доступа по разделам подключается
        постепенно.
      </p>
    </div>
  );
}

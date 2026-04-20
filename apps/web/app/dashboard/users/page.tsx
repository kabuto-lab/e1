'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send, AlertCircle } from 'lucide-react';
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
};

export default function DashboardUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await api.listUsers();
        if (!cancelled) setUsers(rows);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Не удалось загрузить список пользователей',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#1d2327]">Пользователи</h1>
        <span className="font-body text-xs text-[#646970]">
          {loading ? '…' : `${users.length} записей`}
        </span>
      </header>

      {error ? (
        <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#646970]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
          <table className="min-w-full text-[13px]">
            <thead className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left text-[#2c3338]">
              <tr>
                <Th>Роль</Th>
                <Th>Email / ID</Th>
                <Th>Статус</Th>
                <Th>
                  <span className="inline-flex items-center gap-1">
                    <Send className="h-3.5 w-3.5" /> Telegram
                  </span>
                </Th>
                <Th>Привязан</Th>
                <Th>Создан</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#f0f0f1]">
                  <Td>
                    <RoleBadge role={u.role} />
                  </Td>
                  <Td>
                    <div className="font-mono text-[12px] text-[#1d2327]">{u.email}</div>
                    <div className="font-mono text-[11px] text-[#a7aaad]">{u.id.slice(0, 8)}…</div>
                  </Td>
                  <Td>
                    <StatusBadge status={u.status} />
                  </Td>
                  <Td>
                    {u.telegramUsername ? (
                      <span className="font-mono text-[12px] text-[#1d2327]">
                        @{u.telegramUsername}
                      </span>
                    ) : u.telegramId ? (
                      <span className="font-mono text-[11px] text-[#646970]">id {u.telegramId}</span>
                    ) : (
                      <span className="text-[#a7aaad]">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-[#646970]">
                      {u.telegramLinkedAt
                        ? new Date(u.telegramLinkedAt).toLocaleDateString('ru-RU')
                        : '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[#646970]">
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </Td>
                </tr>
              ))}
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#a7aaad]">
                    Пока пусто
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function RoleBadge({ role }: { role: string }) {
  const palette: Record<string, string> = {
    admin: 'bg-[#fcf0f1] text-[#d63638] border-[#d63638]/30',
    manager: 'bg-[#fef8ee] text-[#b26200] border-[#b26200]/30',
    moderator: 'bg-[#e8f0fc] text-[#2271b1] border-[#2271b1]/30',
    model: 'bg-[#f0f6fc] text-[#135e96] border-[#135e96]/30',
    client: 'bg-[#f0f0f1] text-[#50575e] border-[#8c8f94]/30',
  };
  const cls = palette[role] ?? palette.client;
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    active: 'bg-[#edfaef] text-[#00a32a] border-[#00a32a]/30',
    pending_verification: 'bg-[#fef8ee] text-[#b26200] border-[#b26200]/30',
    suspended: 'bg-[#fcf0f1] text-[#d63638] border-[#d63638]/30',
    blacklisted: 'bg-[#1d2327] text-white border-transparent',
  };
  const cls = palette[status] ?? 'bg-[#f0f0f1] text-[#50575e] border-[#8c8f94]/30';
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[11px] ${cls}`}>{status}</span>
  );
}

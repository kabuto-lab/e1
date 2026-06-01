'use client';

/**
 * /admin/settings — заглушка для ссылки из gooey-меню (SettingsGooMenu, пункт «Настройки»).
 *
 * Показывает текущую сессию (email, role, tenant) + список заглушенных
 * подразделов settings. Реальные настройки появятся отдельной сессией —
 * пока что страница нужна чтобы убрать 404 при клике на «Настройки» из gooey.
 */
import { useEffect, useState } from 'react';
import { Bell, KeyRound, Languages, Palette, Shield, User as UserIcon } from 'lucide-react';
import { getAuth, type AuthSession } from '@/lib/auth';

interface StubItem {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STUBS: StubItem[] = [
  {
    title: 'Профиль',
    description: 'Имя, email, аватар, контакты.',
    icon: <UserIcon size={16} />,
  },
  {
    title: 'Безопасность',
    description: 'Смена пароля, 2FA, активные сессии.',
    icon: <Shield size={16} />,
  },
  {
    title: 'API-токены',
    description: 'Personal access tokens для интеграций.',
    icon: <KeyRound size={16} />,
  },
  {
    title: 'Уведомления',
    description: 'Email + Telegram алерты по событиям салонов.',
    icon: <Bell size={16} />,
  },
  {
    title: 'Внешний вид',
    description: 'Тема (auto/dark/light), font scale, density.',
    icon: <Palette size={16} />,
  },
  {
    title: 'Язык интерфейса',
    description: 'Русский · English (планируется).',
    icon: <Languages size={16} />,
  },
];

export default function SettingsPage() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  useEffect(() => {
    setAuth(getAuth());
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold">Настройки</h1>
        <p className="text-[12px] text-text-mute mt-1">
          Раздел в разработке — пока что доступен только просмотр текущей сессии.
        </p>
      </div>

      {/* Current session — единственная реальная информация на этой странице. */}
      <section className="bg-surface border border-line rounded-xl p-4">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-mute mb-3">
          Текущая сессия
        </h2>
        {auth ? (
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
            <dt className="text-text-mute">Email</dt>
            <dd>{auth.email}</dd>
            <dt className="text-text-mute">Роль</dt>
            <dd>
              <span className="font-mono text-[11px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-accent-2/15 text-accent-2">
                {auth.role}
              </span>
            </dd>
            <dt className="text-text-mute">Салон</dt>
            <dd className="font-mono text-[12px] text-gold">
              {auth.tenantSlug || <span className="text-text-mute">— (админ платформы без контекста салона)</span>}
            </dd>
            <dt className="text-text-mute">Kind</dt>
            <dd className="font-mono text-[11px] text-text-dim">{auth.kind}</dd>
          </dl>
        ) : (
          <p className="text-[12px] text-text-mute">Сессия не загружена.</p>
        )}
      </section>

      {/* Planned sub-sections — disabled cards. */}
      <section>
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-mute mb-3">
          Планируется
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STUBS.map((s) => (
            <div
              key={s.title}
              className="bg-surface border border-line rounded-md p-3 flex items-start gap-3 opacity-60 cursor-not-allowed"
              title="В разработке"
            >
              <div className="text-text-mute mt-0.5">{s.icon}</div>
              <div>
                <div className="text-[13px] font-medium">{s.title}</div>
                <div className="text-[11.5px] text-text-mute mt-0.5">{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

'use client';

import { Bell, Settings } from 'lucide-react';
import { type AuthSession } from '@/lib/auth';
import { TenantSwitcher } from './TenantSwitcher';
import { GlobalSearch } from './GlobalSearch';
import { Clock } from './Clock';
import { IconBtn } from './IconBtn';

export function Topbar({ auth }: { auth: AuthSession }) {
  return (
    <header className="flex items-center gap-3.5 py-1.5">
      <TenantSwitcher auth={auth} />
      <GlobalSearch />
      <Clock />
      <div className="flex gap-2">
        <IconBtn dot aria-label="Уведомления">
          <Bell size={16} />
        </IconBtn>
        <IconBtn aria-label="Настройки">
          <Settings size={16} />
        </IconBtn>
      </div>
    </header>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Box,
  Building2,
  UsersRound,
  Calendar,
  Users,
  Package,
  LineChart,
  CreditCard,
  MessageSquare,
  Menu as MenuIcon,
  Wrench,
} from 'lucide-react';
import { clearAuth, type AuthSession } from '@/lib/auth';
import { Brand } from './Brand';
import { RailSection } from './RailSection';
import { RailItem } from './RailItem';
import { RailFooter } from './RailFooter';

/**
 * Rail (compact) — узкий 56px sidebar только из иконок.
 * Label каждого пункта появляется в tooltip'е при hover (pure CSS).
 *
 * Состав групп (из mockup):
 *  Operations: Dashboard, Проекты, Салоны, Мастера, Записи, Клиенты, Чат, Меню сайта
 *  Tools:      Инструменты
 *  Insights:   Аналитика, Биллинг, Склад
 *
 * Disabled пункты — заглушки под будущие страницы; кликом не реагируют.
 */
export function Rail({ auth }: { auth: AuthSession }) {
  const router = useRouter();
  const initial = (auth.email[0] ?? 'A').toUpperCase();
  const name = auth.email.split('@')[0];

  function onLogout(): void {
    clearAuth();
    router.replace('/admin/login');
  }

  return (
    <aside
      className="bg-bg-elev border-r border-line flex flex-col sticky top-0 h-screen items-center"
      style={{ width: 56, overflow: 'visible', zIndex: 50 }}
    >
      <Brand />

      <RailSection>Operations</RailSection>
      <nav className="flex flex-col gap-1 px-2 flex-1 items-center w-full" style={{ overflow: 'visible' }}>
        <RailItem href="/admin" exact icon={<LayoutDashboard />} label="Dashboard" />
        <RailItem href="/admin/projects" icon={<Box />} label="Проекты" badge={10} />
        <RailItem href="#" disabled icon={<Building2 />} label="Салоны" />
        <RailItem href="#" disabled icon={<UsersRound />} label="Мастера" />
        <RailItem href="#" disabled icon={<Calendar />} label="Записи" />
        <RailItem href="#" disabled icon={<Users />} label="Клиенты" />
        <RailItem href="/admin/chat" icon={<MessageSquare />} label="Чат" />
        <RailItem href="/admin/menu" icon={<MenuIcon />} label="Меню сайта" />

        <RailSection>Tools</RailSection>
        <RailItem href="/admin/tools" icon={<Wrench />} label="Инструменты" />

        <RailSection>Insights</RailSection>
        <RailItem href="#" disabled icon={<LineChart />} label="Аналитика" />
        <RailItem href="#" disabled icon={<CreditCard />} label="Биллинг" />
        <RailItem href="#" disabled icon={<Package />} label="Склад" />
      </nav>

      <RailFooter initial={initial} name={name} role={auth.role} onLogout={onLogout} />
    </aside>
  );
}

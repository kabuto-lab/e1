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
  Tags,
  Wrench,
  FileText,
  Network,
  MapPin,
  Handshake,
  TrendingUp,
  Award,
  Briefcase,
  Images,
} from 'lucide-react';
import { clearAuth, type AuthSession } from '@/lib/auth';
import { tenantCan, type SiteType } from '@/lib/site-type-capabilities';
import { Brand } from './Brand';
import { RailSection } from './RailSection';
import { RailItem } from './RailItem';
import { RailFooter } from './RailFooter';

/**
 * Rail (compact) — узкий 56px sidebar только из иконок.
 * Label каждого пункта появляется в tooltip'е при hover (pure CSS).
 *
 * Состав групп (из mockup):
 *  Operations: Dashboard, Проекты, Услуги, Салоны, Мастера, Записи, Клиенты, Чат, Меню сайта
 *  Tools:      Инструменты
 *  Insights:   Аналитика, Биллинг, Склад
 *
 * Disabled пункты — заглушки под будущие страницы; кликом не реагируют.
 */
export function Rail({ auth, siteType }: { auth: AuthSession; siteType?: SiteType | null }) {
  const router = useRouter();
  const initial = (auth.email[0] ?? 'A').toUpperCase();
  const name = auth.email.split('@')[0];

  function onLogout(): void {
    clearAuth();
    router.replace('/admin/login');
  }

  // Work-for-you (wfy-city-dir) vertical modules. Each item is gated by the
  // capability matrix (tenantCan); `opportunities` has no matrix key yet
  // (see Productor-debt) so it follows the section's site-type guard directly.
  // Section is hidden entirely unless siteType is resolved AND is wfy-city-dir.
  const isWfy = siteType === 'wfy-city-dir';
  const showWfySection =
    !!siteType &&
    (isWfy ||
      tenantCan(siteType, 'city-pages') ||
      tenantCan(siteType, 'partner-salons') ||
      tenantCan(siteType, 'advantages') ||
      tenantCan(siteType, 'vacancies'));

  return (
    <aside
      className="bg-bg-elev border-r border-line flex flex-col sticky top-0 h-screen items-center"
      style={{ width: 56, overflow: 'visible', zIndex: 1100 }}
    >
      <Brand auth={auth} />

      <RailSection>Operations</RailSection>
      <nav className="flex flex-col gap-1 px-2 flex-1 items-center w-full" style={{ overflow: 'visible' }}>
        <RailItem href="/admin" exact icon={<LayoutDashboard />} label="Dashboard" />
        <RailItem href="/admin/projects" icon={<Box />} label="Проекты" badge={10} />
        <RailItem href="/admin/services" icon={<Tags />} label="Услуги" />
        <RailItem href="/admin/salons" icon={<Building2 />} label="Салоны" />
        <RailItem href="/admin/staff" icon={<UsersRound />} label="Мастера" />
        <RailItem href="/admin/models" icon={<Images />} label="Модели" />
        <RailItem href="#" disabled icon={<Calendar />} label="Записи" />
        <RailItem href="/admin/clients" icon={<Users />} label="Клиенты" />
        <RailItem href="/admin/chat" icon={<MessageSquare />} label="Чат" />
        <RailItem href="/admin/menu" icon={<MenuIcon />} label="Меню сайта" />
        <RailItem href="/admin/cms" icon={<FileText />} label="CMS-страницы" />

        {showWfySection && (
          <>
            <RailSection>Work-for-you</RailSection>
            {tenantCan(siteType!, 'city-pages') && (
              <RailItem href="/admin/wfy/cities" icon={<MapPin />} label="Города" />
            )}
            {tenantCan(siteType!, 'partner-salons') && (
              <RailItem
                href="/admin/wfy/partner-salons"
                icon={<Handshake />}
                label="Партнёрские салоны"
              />
            )}
            {isWfy && (
              <RailItem
                href="/admin/wfy/opportunities"
                icon={<TrendingUp />}
                label="Возможности"
              />
            )}
            {tenantCan(siteType!, 'advantages') && (
              <RailItem href="/admin/wfy/advantages" icon={<Award />} label="Преимущества" />
            )}
            {tenantCan(siteType!, 'vacancies') && (
              <RailItem href="/admin/wfy/vacancies" icon={<Briefcase />} label="Вакансии" />
            )}
          </>
        )}

        <RailSection>Tools</RailSection>
        <RailItem href="/admin/tools" icon={<Wrench />} label="Инструменты" />
        <RailItem href="/admin/tenants" icon={<Network />} label="Тенанты (platform-admin)" />

        <RailSection>Insights</RailSection>
        <RailItem href="#" disabled icon={<LineChart />} label="Аналитика" />
        <RailItem href="#" disabled icon={<CreditCard />} label="Биллинг" />
        <RailItem href="#" disabled icon={<Package />} label="Склад" />
      </nav>

      <RailFooter initial={initial} name={name} role={auth.role} onLogout={onLogout} />
    </aside>
  );
}

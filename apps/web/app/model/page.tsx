import Link from 'next/link';
import { User, Calendar, Images, Radio, Settings } from 'lucide-react';

const SECTIONS = [
  { href: '/model/profile', icon: User, title: 'Мой профиль', desc: 'Имя, биография, ставки, параметры' },
  { href: '/model/bookings', icon: Calendar, title: 'Мои брони', desc: 'Заявки и история встреч' },
  { href: '/model/photos', icon: Images, title: 'Фото', desc: 'Портфолио и главное фото' },
  { href: '/model/status', icon: Radio, title: 'Статус', desc: 'Доступность: онлайн / занята / офлайн' },
  { href: '/model/settings', icon: Settings, title: 'Настройки', desc: 'Telegram и уведомления' },
];

export default function ModelDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Кабинет модели</h1>
        <p className="mt-2 font-body text-sm text-white/40">
          Управление анкетой, бронями и настройками.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-[#141414]/80 p-5 transition-colors hover:border-[#d4af37]/25"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-[#d4af37]">{s.title}</h2>
              <p className="mt-0.5 font-body text-sm text-white/35">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

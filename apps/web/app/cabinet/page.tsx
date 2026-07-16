import Link from 'next/link';
import { User, Heart, Calendar, Wallet, MessageSquare, Settings } from 'lucide-react';

const SECTIONS = [
  { href: '/cabinet/profile', icon: User, title: 'Профиль', desc: 'Личные данные и контакты' },
  { href: '/cabinet/favorites', icon: Heart, title: 'Избранное', desc: 'Сохранённые анкеты' },
  { href: '/cabinet/bookings', icon: Calendar, title: 'Встречи', desc: 'Заявки и бронирования' },
  { href: '/cabinet/payments', icon: Wallet, title: 'Оплаты', desc: 'Эскроу и история' },
  { href: '/cabinet/messages', icon: MessageSquare, title: 'Сообщения', desc: 'Переписка' },
  { href: '/cabinet/settings', icon: Settings, title: 'Настройки', desc: 'Telegram' },
];

export default function CabinetHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Личный кабинет</h1>
        <p className="mt-2 font-body text-sm text-white/40">
          Здесь собраны избранные анкеты, ваши встречи, оплаты, сообщения и настройки аккаунта.
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
              <h2 className="font-display text-lg font-semibold text-[#d4af37]">{s.title}</h2>
              <p className="mt-1 font-body text-sm text-white/35">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

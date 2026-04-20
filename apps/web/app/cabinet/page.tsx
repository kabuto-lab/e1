import Link from 'next/link';

export default function CabinetHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Личный кабинет</h1>
        <p className="mt-2 font-body text-sm text-white/40">
          Разделы по ТЗ: избранное, встречи, оплаты, клуб, сообщения и документы. Часть экранов пока
          заглушки до подключения API.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: '/cabinet/favorites', title: 'Избранное', desc: 'Сохранённые анкеты' },
          { href: '/cabinet/bookings', title: 'Встречи', desc: 'Заявки и бронирования' },
          { href: '/cabinet/payments', title: 'Оплаты', desc: 'Эскроу и история' },
          { href: '/cabinet/club', title: 'Клуб', desc: 'Подписка и привилегии' },
          { href: '/cabinet/messages', title: 'Сообщения', desc: 'Переписка' },
          { href: '/cabinet/notifications', title: 'Уведомления', desc: 'Центр уведомлений' },
          { href: '/cabinet/documents', title: 'Документы', desc: 'Договоры и файлы' },
          { href: '/cabinet/settings', title: 'Настройки', desc: 'Telegram и предпочтения' },
        ].map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className="rounded-xl border border-white/[0.06] bg-[#141414]/80 p-5 transition-colors hover:border-[#d4af37]/25"
          >
            <h2 className="font-display text-lg font-semibold text-[#d4af37]">{x.title}</h2>
            <p className="mt-1 font-body text-sm text-white/35">{x.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

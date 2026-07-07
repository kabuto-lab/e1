'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const sections = [
  {
    title: 'Каталог моделей',
    body: (
      <>
        На странице{' '}
        <Link href="/models" className="text-[#d4af37] underline-offset-2 hover:underline">
          Модели
        </Link>{' '}
        доступны фильтры по статусу, рейтингу и другим параметрам. Карточки в каталоге показывают только опубликованные и
        верифицированные анкеты.
      </>
    ),
  },
  {
    title: 'Аккаунт и панель',
    body: (
      <>
        Вход — через{' '}
        <Link href="/login" className="text-[#d4af37] underline-offset-2 hover:underline">
          страницу входа
        </Link>
        . Клиенты попадают в{' '}
        <Link href="/cabinet" className="text-[#d4af37] underline-offset-2 hover:underline">
          личный кабинет
        </Link>
        , администраторы и менеджеры — в{' '}
        <Link href="/dashboard" className="text-[#d4af37] underline-offset-2 hover:underline">
          панель управления
        </Link>
        .
      </>
    ),
  },
  {
    title: 'Связь с нами',
    body: (
      <>
        Вопросы и заявки — через форму на странице{' '}
        <Link href="/contacts" className="text-[#d4af37] underline-offset-2 hover:underline">
          Контакты
        </Link>
        .
      </>
    ),
  },
  {
    title: 'Конфиденциальность',
    body: (
      <>
        Мы обрабатываем персональные данные в рамках работы платформы согласно{' '}
        <a
          href="/legal/privacy-policy.docx"
          download
          className="text-[#d4af37] underline-offset-2 hover:underline"
        >
          Политике обработки персональных данных
        </a>
        . Условия оказания услуг — в{' '}
        <a href="/legal/oferta.docx" download className="text-[#d4af37] underline-offset-2 hover:underline">
          Публичной оферте
        </a>
        , согласие на обработку данных — в{' '}
        <a href="/legal/pd-consent.docx" download className="text-[#d4af37] underline-offset-2 hover:underline">
          Согласии на обработку персональных данных
        </a>
        .
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <SiteHeader variant="page" segment={{ crumbs: [{ label: 'Помощь' }] }} />
      <main className="flex-1 mx-auto w-full max-w-[640px] px-6 py-12 md:py-20">
        <p className="mb-2 font-body text-[10px] font-medium uppercase tracking-[0.2em] text-[#d4af37]">Справка</p>
        <h2 className="mb-10 font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
          Как пользоваться сайтом
        </h2>
        <ul className="space-y-10">
          {sections.map((s) => (
            <li key={s.title}>
              <h3 className="mb-3 font-display text-lg font-semibold text-white">{s.title}</h3>
              <p className="font-body text-sm leading-relaxed text-white/55 md:text-base">{s.body}</p>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}

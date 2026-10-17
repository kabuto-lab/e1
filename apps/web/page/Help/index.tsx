import Link from 'next/link';
import { FaqItem } from '@/components/FaqItem';
import { FAQ_CATEGORIES, type FaqEntry } from './ui/faqContent';

/** Ответ из трёх частей: прямой ответ, условия (если есть), действие пользователя. */
const FaqAnswer = ({ entry }: { entry: FaqEntry }) => (
  <>
    <p className="text-white/80">{entry.answer}</p>
    {entry.conditions ? (
      <p>
        <span className="font-semibold text-white/80">Условия. </span>
        {entry.conditions}
      </p>
    ) : null}
    {entry.action ? (
      <p>
        <span className="font-semibold text-[#d4af37]">Что сделать. </span>
        {entry.action}
      </p>
    ) : null}
  </>
);

export const Help = () => (
  <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 md:px-10 md:py-16">
    {/* Одна центрированная колонка: меню категорий слева убрано по ТЗ — вопросы идут подряд, без пустого места слева. */}
    <div className="mx-auto w-full max-w-3xl">
      {/* Блок 1. Первый экран */}
      <header>
        <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
          Бронирование, оплата и безопасная сделка
        </h1>
        <p className="mt-4 font-body text-base leading-relaxed text-white/60">
          Как проходит встреча, когда списываются деньги и что делать, если возникла проблема.
        </p>
      </header>

      {/* Блок 2. Вопросы по разделам */}
      <div className="mt-10 flex min-w-0 flex-col gap-12 md:mt-12 md:gap-14">
        {FAQ_CATEGORIES.map((category) => (
          <section
            key={category.id}
            id={category.id}
            aria-labelledby={`${category.id}-title`}
            className="scroll-mt-[calc(var(--site-header-height)+24px)]"
          >
            <h2 id={`${category.id}-title`} className="font-display text-2xl font-bold text-white md:text-3xl">
              {category.title}
            </h2>
            <div className="mt-4 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {category.items.map((entry) => (
                <FaqItem key={entry.question} question={entry.question} answer={<FaqAnswer entry={entry} />} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Блок 3. Завершение страницы */}
      <section
        aria-labelledby="help-not-found"
        className="mt-16 flex flex-col gap-6 rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 md:mt-20 md:flex-row md:items-center md:justify-between md:p-8"
      >
        <div className="max-w-2xl">
          <h2 id="help-not-found" className="font-display text-2xl font-bold leading-tight text-white md:text-3xl">
            Не нашли ответ?
          </h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-white/60 md:text-base">
            Напишите в поддержку. Если вопрос связан со встречей, укажите номер бронирования.
          </p>
        </div>
        <Link href="/contacts" className="btn-primary shrink-0 justify-center">
          Связаться с поддержкой
        </Link>
      </section>
    </div>
  </main>
);

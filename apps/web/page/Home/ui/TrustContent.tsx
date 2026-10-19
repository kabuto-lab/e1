'use client';

import Link from 'next/link';
import { BadgeCheck, Camera, IdCard, type LucideIcon } from 'lucide-react';
import { FaqItem } from '@/components/FaqItem';

/** Что входит в проверку профиля — формулировки совпадают с ТЗ блока и с тем, как отметка выглядит в каталоге. */
const VERIFICATION_CHECKS: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: IdCard,
    title: 'Личность модели',
    text: 'До публикации профиля проверяем личность модели.',
  },
  {
    Icon: Camera,
    title: 'Фотографии',
    text: 'Сверяем фотографии в профиле.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Выберите модель',
    body: 'Откройте профиль и выберите удобное время.',
  },
  {
    number: '02',
    title: 'Забронируйте встречу',
    body: 'Сумма резервируется на карте, но не списывается.',
  },
  {
    number: '03',
    title: 'Встретьтесь',
    body: 'Если что-то не так — поддержка поможет разобраться.',
  },
  {
    number: '04',
    title: 'Оплата — после встречи',
    body: 'После проверки сотрудник спишет сумму с резерва.',
  },
];

export function DealSteps() {
  return (
    <section id="steps" className="scroll-mt-24 border-t border-white/[0.06] py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Безопасная сделка</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white md:text-4xl">От выбора до оплаты — четыре шага</h2>
          <p className="mt-4 font-body text-base leading-relaxed text-white/60">Сумма резервируется на карте при бронировании и не списывается до завершения встречи.</p>
        </div>

        <ol className="grid gap-8 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, index) => {
            const isLast = index === STEPS.length - 1;
            return (
              <li key={step.number} className="relative flex items-start gap-4 lg:flex-col lg:items-center lg:gap-0">
                {!isLast && (
                  <>
                    <span
                      aria-hidden
                      className="absolute left-6 top-12 -bottom-8 w-px -translate-x-1/2 bg-gradient-to-b from-[#d4af37]/35 to-[#d4af37]/15 lg:hidden"
                    />
                    <span
                      aria-hidden
                      className="absolute left-[calc(50%_+_24px)] top-6 hidden h-px w-[calc(100%_-_24px)] bg-gradient-to-r from-[#d4af37]/35 to-[#d4af37]/15 lg:block"
                    />
                  </>
                )}
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#0a0a0a] font-display text-sm font-bold tabular-nums text-[#d4af37]">
                  {step.number}
                </span>
                <div className="pt-1 lg:mt-6 lg:w-full lg:pt-0 lg:text-center">
                  <h3 className="font-display text-base font-semibold leading-snug text-white">{step.title}</h3>
                  {/* Описания ≤ ~50 символов — в колонке ~260px (lg) укладываются в две строки; balance выравнивает их длину. */}
                  <p className="mt-2 font-body text-sm leading-relaxed text-white/60 lg:text-balance">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function Protection() {
  return (
    <section className="border-t border-white/[0.06] py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Понятные условия</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white md:text-4xl">Спокойнее, когда условия понятны обеим сторонам</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-8">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Для клиента</p>
            <h3 className="mt-3 font-display text-xl font-semibold text-white">Деньги резервируются до встречи</h3>
            <p className="mt-3 font-body text-sm leading-relaxed text-white/60">При оплате картой сумма сначала резервируется. После встречи сотрудник My Muse проверяет бронирование и вручную инициирует списание по условиям оферты.</p>
          </article>
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-8">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Для модели</p>
            <h3 className="mt-3 font-display text-xl font-semibold text-white">Сумма зарезервирована заранее</h3>
            <p className="mt-3 font-body text-sm leading-relaxed text-white/60">До встречи клиент резервирует сумму оплаты. После проверки бронирования сотрудник My Muse завершает оплату согласно условиям сделки.</p>
            <Link href="/for-models" className="mt-5 inline-flex font-body text-sm font-medium text-[#d4af37] underline-offset-4 hover:underline">Условия для моделей</Link>
          </article>
        </div>
      </div>
    </section>
  );
}

export function Verification() {
  return (
    <section className="border-t border-white/[0.06] py-16 md:py-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 md:grid-cols-2 md:gap-16 md:px-10">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Подтверждённые профили</p>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white md:text-3xl">Важно знать, с кем вы встречаетесь</h2>
          <p className="mt-4 font-body text-base leading-relaxed text-white/65">Мы проверяем личность модели и соответствие фотографий перед публикацией профиля.</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 font-body text-[11px] font-medium text-emerald-200"
              title="Личность модели и соответствие фотографий проверены My Muse"
            >
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Профиль подтверждён
            </span>
          </div>
        </div>

        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Что проверяем</p>
          <ul className="mt-5 flex flex-col gap-5">
            {VERIFICATION_CHECKS.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[#d4af37]"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 font-body text-sm leading-relaxed text-white/55">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Support() {
  return (
    <section id="support" className="scroll-mt-24 border-t border-white/[0.06] py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="flex flex-col gap-6 rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          {/* Без контактов, часов работы и оферты: они уже есть в подвале и на /contacts. */}
          <div className="max-w-2xl">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Поддержка My Muse</p>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white md:text-3xl">Остались вопросы?</h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-white/60">Обратитесь в поддержку — поможем с бронированием и оплатой.</p>
          </div>
          <Link href="/contacts" className="btn-primary shrink-0 justify-center self-start md:self-auto">Связаться с поддержкой</Link>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    question: 'Нужно ли регистрироваться, чтобы посмотреть модели?',
    answer: 'Нет, каталог открыт. Аккаунт для просмотра не нужен; заявку на бронирование можно отправить и без входа.',
  },
  {
    question: 'Деньги списываются сразу?',
    answer: 'При оплате картой сумма сначала резервируется на карте через двухстадийный платёж T‑Банка. Списание с резерва вручную инициирует сотрудник My Muse после проверки бронирования.',
  },
  {
    question: 'Зачем резервировать деньги?',
    answer: 'Резерв показывает, что сумма для оплаты доступна. Средства не списываются в момент создания бронирования.',
  },
  {
    question: 'Что означает «Профиль подтверждён»?',
    answer: 'Это значит, что проверка профиля и материалов модели пройдена перед публикацией.',
  },
  {
    question: 'Что делать, если возникло разногласие?',
    answer: 'Обратитесь в поддержку My Muse или откройте спор по бронированию. Порядок рассмотрения и условия сделки указаны в публичной оферте.',
  },
];

export function HomeFAQ() {
  return (
    <section className="border-t border-white/[0.06] py-16 md:py-24">
      <div className="mx-auto max-w-[900px] px-6 md:px-10">
        <div className="mb-8 text-center md:mb-10">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">Вопросы и ответы</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white md:text-4xl">Перед бронированием</h2>
        </div>
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/help" className="font-body text-sm text-[#d4af37] underline-offset-4 hover:underline">Все вопросы и ответы</Link>
        </p>
      </div>
    </section>
  );
}

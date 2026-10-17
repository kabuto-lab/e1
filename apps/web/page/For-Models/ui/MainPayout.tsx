import {
    MAIN_SECTION_BODY_CLASS,
    MAIN_SECTION_CLASS,
    MAIN_SECTION_TITLE_CLASS,
} from './mainSectionClasses';

/**
 * Основной режим: блок «Как вы получаете оплату» — три шага безопасной сделки.
 * Формулировки совпадают с описанием двухстадийного платежа T-Банка на остальных страницах.
 */
const STEPS = [
    {
        step: 1,
        title: 'Бронирование',
        text: 'Сумма резервируется на карте клиента',
    },
    {
        step: 2,
        title: 'Встреча',
        text: 'Стороны сообщают о результате',
    },
    {
        step: 3,
        title: 'Расчёт',
        text: 'My Muse проверяет бронирование и проводит оплату по условиям сделки',
    },
];

export const MainPayout = () => (
    <section className={MAIN_SECTION_CLASS}>
        {/* Подпись «Безопасная сделка» встаёт в строку с заголовком только от lg:
            на 768–1023px заголовок в 48px и подпись вместе не помещаются. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
            <h2 className={MAIN_SECTION_TITLE_CLASS}>Как вы получаете оплату</h2>
            <p className="font-body text-sm text-white/45 lg:pb-2">Безопасная сделка через T-Банк</p>
        </div>

        <div className={`relative grid w-full gap-10 md:grid-cols-3 md:gap-8 ${MAIN_SECTION_BODY_CLASS}`}>
            {STEPS.map(({ step, title, text }, index) => {
                const isLast = index === STEPS.length - 1;
                return (
                    <div
                        key={step}
                        className="relative z-[1] flex items-start gap-4 md:flex-col md:items-center md:gap-6 md:text-center"
                    >
                        {/* Связка шагов. На узком экране шаги идут в столбик и линия вертикальная:
                            от нижнего края кружка (46px) до верха следующего шага (−40px = gap-10).
                            От md — горизонтальная, от правого края своего кружка до левого края следующего:
                            круг по центру колонки, поэтому 50% + 23px (полкружка) и
                            -(50% + 9px) = -(половина колонки + отступ колонки 32px − полкружка 23px). */}
                        {!isLast ? (
                            <>
                                <span
                                    aria-hidden
                                    className="absolute bottom-[-40px] left-[23px] top-[46px] w-px bg-[#d4af37]/20 md:hidden"
                                />
                                <span
                                    aria-hidden
                                    className="absolute left-[calc(50%_+_23px)] right-[calc(-50%_-_9px)] top-[23px] hidden h-px bg-[#d4af37]/20 md:block"
                                />
                            </>
                        ) : null}

                        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#141414] font-display text-base font-bold text-[#d4af37]">
                            {step}
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="font-display text-lg font-bold text-white md:text-xl">{title}</h3>
                            <p className="max-w-[320px] font-body text-base leading-relaxed text-white/60">{text}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    </section>
);

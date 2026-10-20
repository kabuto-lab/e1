import { Check } from 'lucide-react';
import { MAIN_SECTION_BODY_CLASS, MAIN_SECTION_CLASS, MAIN_SECTION_TITLE_CLASS } from './mainSectionClasses';

/** Основной режим: блок «Понятные условия» — единая карточка с комиссией и условиями. */
const TERMS = [
    'С состоявшейся сделки',
    'Без платы за размещение',
    'Без абонентской платы',
    'Без скрытых комиссий за продвижение анкеты',
    'Один тариф — для моделей и для менеджеров',
    'Сумма брони видна клиенту заранее, до подтверждения',
];

export const MainTerms = () => (
    <section className={MAIN_SECTION_CLASS}>
        <h2 className={MAIN_SECTION_TITLE_CLASS}>Понятные условия</h2>

        <div className={MAIN_SECTION_BODY_CLASS}>
            <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-6 sm:p-8 md:p-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/[0.08] px-4 py-1.5 font-display text-sm font-bold text-[#d4af37]">
                    5% комиссия
                </span>

                <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 md:mt-8">
                    {TERMS.map((item) => (
                        <li key={item} className="flex items-start gap-3 font-body text-base text-white/75 md:text-lg">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/[0.12] text-[#d4af37]">
                                <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </section>
);

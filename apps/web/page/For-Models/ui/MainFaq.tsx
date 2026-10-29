import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FaqItem } from '@/components/FaqItem';
import { MAIN_SECTION_BODY_CLASS, MAIN_SECTION_CLASS, MAIN_SECTION_TITLE_CLASS } from './mainSectionClasses';

/**
 * Основной режим: «Если встреча прошла не по плану» — вопросы модели о спорных ситуациях.
 * Ответы совпадают с публичной офертой и со страницей «Вопросы и ответы» (/help).
 */
const FAQ_ITEMS = [
    {
        question: 'Клиент не пришёл — что с оплатой?',
        answer:
            'Если не пришёл клиент, услуга считается оказанной, и сумма не возвращается (п. 5.3 оферты). Если не пришла модель, сообщите в поддержку — сотрудник проверит бронирование до списания.',
    },
    {
        question: 'Что делать при разногласиях?',
        answer:
            'Напишите в поддержку и опишите ситуацию. Спор рассматривает сотрудник My Muse по данным бронирования: либо возврат, либо завершение сделки со списанием и выплатой.',
    },
    {
        question: 'Когда поступает выплата?',
        answer:
            'После того как сотрудник My Muse завершит сделку, сумма за вычетом комиссии 5% попадает в баланс раздела «Заработок». Вывод оформляется по заявке: сотрудник одобряет её и переводит деньги по указанным реквизитам.',
    },
];

export const MainFaq = () => (
    <section className={MAIN_SECTION_CLASS}>
        <h2 className={MAIN_SECTION_TITLE_CLASS}>Если встреча прошла не по плану</h2>

        {/* Колонка поддержки отходит вбок только от lg: на 768–1023px вопросы сжались бы до 390px. */}
        <div className={`grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14 ${MAIN_SECTION_BODY_CLASS}`}>
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
                {FAQ_ITEMS.map((item) => (
                    <FaqItem key={item.question} question={item.question} answer={item.answer} />
                ))}
            </div>

            {/* На узком экране колонка поддержки просто идёт под вопросами: у списка уже есть
                своя нижняя граница, второй линии на расстоянии 40px не нужно. */}
            <div className="lg:border-l lg:border-white/[0.08] lg:pl-10">
                <p className="font-body text-base text-white/70">Остались вопросы?</p>
                <Link
                    href="/contacts"
                    className="mt-3 inline-flex items-center gap-2 font-body text-sm font-medium text-[#d4af37] underline-offset-4 hover:underline"
                >
                    Связаться с поддержкой
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
            </div>
        </div>
    </section>
);

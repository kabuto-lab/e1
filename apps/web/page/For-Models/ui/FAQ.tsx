interface IFaqItemProps {
    question: string;
    answer: string;
    last?: boolean;
}

const FaqItem = ({ question, answer, last }: IFaqItemProps) => (
    <div className={`py-6 flex flex-col gap-2 ${last ? "" : "border-b border-white/[0.06]"}`}>
        <p className="font-body text-base font-semibold text-white">{question}</p>
        <p className="font-body text-sm text-white/40">{answer}</p>
    </div>
)

export const FAQ = () => {
    return (
        <div className="flex flex-col gap-12 py-24">
            <div className="w-full text-center flex flex-col gap-3">
                <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                    Вопросы
                </span>

                <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
                    Коротко о главном
                </h2>
            </div>

            <div className="mx-auto flex w-full max-w-[760px] flex-col">
                <FaqItem question="Сколько стоит размещение?" answer="Бесплатно." />
                <FaqItem question="Какая комиссия?" answer="5% с состоявшейся сделки." />
                <FaqItem question="Можно ли менеджеру добавить несколько моделей?" answer="Да." />
                <FaqItem
                    question="Как проходит оплата?"
                    answer="Через безопасную сделку на платформе с последующей выплатой исполнителю или менеджеру."
                    last
                />
            </div>
        </div>
    )
}
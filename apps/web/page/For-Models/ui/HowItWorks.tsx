interface IStepProps {
    step: number;
    text: string;
}

const Step = ({ step, text }: IStepProps) => (
    <div className="relative z-[1] flex flex-col items-center gap-4 px-2 text-center max-[900px]:flex-row">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#141414] font-display text-base font-bold text-[#d4af37]">
            {step}
        </div>

        <p className="font-body text-[13px] leading-relaxed text-white/55 max-[900px]:text-left">{text}</p>
    </div>
)

export const HowItWorks = () => {
    return (
        <div className="flex flex-col gap-12 py-24">
            <div className="w-full text-center flex flex-col gap-3">
                <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                    Процесс
                </span>

                <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
                    Как работает My Muse
                </h2>
            </div>

            <div className="relative grid grid-cols-5 gap-4 max-[900px]:grid-cols-1 max-[900px]:gap-10">
                <div className="absolute left-[10%] right-[10%] top-[23px] h-px bg-[#d4af37]/15 max-[900px]:hidden" />

                <Step step={1} text="Создаёте анкету или добавляете несколько моделей" />
                <Step step={2} text="Проходите модерацию и верификацию" />
                <Step step={3} text="Получаете сообщения и бронирования от клиентов" />
                <Step step={4} text="Клиент оплачивает через платформу" />
                <Step step={5} text="Оформляется выплата исполнителю или менеджеру" />
            </div>
        </div>
    )
}
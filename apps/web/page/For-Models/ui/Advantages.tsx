import { FilePlus, Percent, ShieldCheck, Users } from "lucide-react";
import { ReactElement } from "react"

interface IProps {
    icon: ReactElement,
    title: string;
    bio: string;
}

const AdvantagCard = ({ icon, title, bio }: IProps) => (
    <div className="min-w-[25%] min-h-[210px] group p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/20 hover:bg-[#d4af37]/[0.03] transition-all duration-300 max-[1260px]:min-h-[150px]">
        <div className="mb-4 text-[#d4af37]">
            {icon}
        </div>

        <h3 className="font-display text-base font-bold mb-2 group-hover:text-[#d4af37] transition-colors">{title}</h3>

        <p className="font-body text-base text-white/45 leading-relaxed">{bio}</p>
    </div>
)

export const Advantages = () => {
    return (
        <div className="flex flex-col gap-12 py-24">
            <div className="w-full text-center flex flex-col gap-3">
                <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                    Почему My Muse
                </span>

                <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
                    Основные преимущества
                </h2>
            </div>

            <div className="grid grid-cols-4 gap-3 max-[1260px]:grid-cols-2 max-[650px]:grid-cols-1">
                <AdvantagCard
                    icon={<FilePlus className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.2]" />}
                    title="Бесплатное размещение"
                    bio="Создание и публикация анкеты без оплаты."
                />
                 <AdvantagCard
                    icon={<Users className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.2]" />}
                    title="Дополнительный поток клиентов"
                    bio="My Muse привлекает клиентский трафик на анкеты."
                />
                 <AdvantagCard
                    icon={<ShieldCheck className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.2]" />}
                    title="Безопасная сделка"
                    bio="Клиент оплачивает через платформу, выплата производится после выполнения услуги."
                />
                  <AdvantagCard
                    icon={<Percent className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.2]" />}
                    title="Комиссия только за результат"
                    bio="5% с состоявшейся сделки. Без абонентской платы."
                />
            </div>
        </div>
    )
}
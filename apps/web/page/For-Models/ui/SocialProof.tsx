import { Check } from "lucide-react";

const PROOF_ITEMS = ['Анкеты уже опубликованы в каталоге', 'Доступны чаты и бронирование', 'Система оплаты и безопасной сделки протестирована', 'Анкеты проходят модерацию и верификацию', 'Начинается активное привлечение клиентского трафика'];

export const SocialProof = () => (
    <div className="flex flex-col gap-12 py-24 items-center">
        <div className="w-full text-center flex flex-col gap-3">
            <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                Уже сегодня
            </span>

            <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
                My Muse уже работает
            </h2>
        </div>

        <div className="flex flex-col gap-2">
            {PROOF_ITEMS.map((item, i) => (
                <div className="flex items-center gap-2" key={i}>
                    <Check size={18} color="green" />
                    <p className="font-body text-lg text-white/35 leading-relaxed">{item}</p>
                </div>
            ))}
        </div>
    </div>
)
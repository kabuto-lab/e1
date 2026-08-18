import { SECTIONS } from "./ui/constants"

export const Help = () => (
    <main className="flex-1 mx-auto w-full max-w-[640px] px-6 py-12 md:py-20">
        <p className="mb-2 font-body text-[10px] font-medium uppercase tracking-[0.2em] text-[#d4af37]">Справка</p>
        <h2 className="mb-10 font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
            Как пользоваться сайтом
        </h2>
        <ul className="space-y-10">
            {SECTIONS.map((s) => (
                <li key={s.title}>
                    <h3 className="mb-3 font-display text-lg font-semibold text-white">{s.title}</h3>
                    <p className="font-body text-sm leading-relaxed text-white/55 md:text-base">{s.body}</p>
                </li>
            ))}
        </ul>
    </main>
)
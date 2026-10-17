import Image from 'next/image';
import { MAIN_SECTION_BODY_CLASS, MAIN_SECTION_CLASS, MAIN_SECTION_TITLE_CLASS } from './mainSectionClasses';

/** Основной режим: блок «Понятные условия» — комиссия 5% и условия размещения. */
const TERMS = ['С состоявшейся сделки', 'Без платы за размещение', 'Без абонентской платы'];

const TERMS_IMAGE = '/images/models/magnific_generate-a-verification-s_Doh5jdrpcl.jpg';

export const MainTerms = () => (
    <section className={MAIN_SECTION_CLASS}>
        <h2 className={MAIN_SECTION_TITLE_CLASS}>Понятные условия</h2>

        <div className={`grid items-center gap-10 md:grid-cols-2 md:gap-12 ${MAIN_SECTION_BODY_CLASS}`}>
            {/* Число и список идут в одну строку только от xl: в колонке 340–468px (md–lg)
                тексту оставалось ~140px, и каждый пункт переносился на два-три слова. */}
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:gap-10">
                <span className="font-display text-[3.5rem] font-bold leading-none text-[#d4af37] sm:text-[4.5rem] md:text-[7rem]">
                    5%
                </span>
                <ul className="flex flex-col gap-3 border-l border-white/[0.12] pl-5 font-body text-base text-white/75 sm:pl-6 md:text-lg">
                    {TERMS.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>

            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414]">
                <Image
                    src={TERMS_IMAGE}
                    alt="Люди встречаются здесь"
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1399px) 50vw, 640px"
                    className="object-cover"
                />
                {/* Затемняем кадр снизу сильнее: на телефоне и планшете под подпись попадает
                    светлая часть снимка и белый текст на ней не читается. */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <p className="absolute bottom-5 right-5 max-w-[8rem] text-right font-body text-[10px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-white/85 sm:max-w-[10rem] sm:text-[11px]">
                    Люди встречаются здесь
                </p>
            </div>
        </div>
    </section>
);

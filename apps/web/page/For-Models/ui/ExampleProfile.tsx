"use client";

import { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import Image from "next/image";

const Screenshot = ({ src, alt, onOpen }: { src: string; alt: string; onOpen: () => void }) => (
    <button
        type="button"
        onClick={onOpen}
        className="group relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414] transition-colors hover:border-[#d4af37]/25"
    >
        <Image src={src} alt={alt} fill className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />

        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.14] bg-black/50 text-white/80 backdrop-blur-sm transition-colors group-hover:border-[#d4af37]/50 group-hover:text-[#d4af37]">
            <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
        </span>
    </button>
)

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="fixed right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-white/70 transition-colors hover:border-[#d4af37]/40 hover:text-white"
            >
                <X className="h-5 w-5" />
            </button>

            <div className="relative h-full max-h-[90vh] w-full max-w-[1200px]">
                <Image src={src} alt={alt} fill className="object-contain" />
            </div>
        </div>,
        document.body,
    );
}

interface IProps {
    mode: 'main' | 'massage';
}

export const ExampleProfile: FC<IProps> = ({ mode }) => {
    const [openSrc, setOpenSrc] = useState<{ src: string; alt: string } | null>(null);
    const isMassageMode = mode === 'massage';

    const cardImage = isMassageMode ? "/images/for-models-massage-example-card.png" : "/images/for-models-example-card.png";
    const pageImage = isMassageMode ? "/images/for-models-massage-example-page.webp" : "/images/for-models-example-page.png"

    return (
        <div className="flex flex-col gap-10 py-24">
            <div className="w-full text-center flex flex-col gap-3">
                <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                    Пример анкеты
                </span>

                <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3 mb-5">
                    Как выглядит анкета для клиента
                </h2>
            </div>

            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-6 max-[720px]:grid-cols-1">
                    <Screenshot
                        src={cardImage}
                        alt="Карточка анкеты в каталоге"
                        onOpen={() => setOpenSrc({ src: cardImage, alt: "Карточка анкеты в каталоге" })}
                    />
                    <Screenshot
                        src={pageImage}
                        alt="Страница анкеты с кнопкой связи и бронирования"
                        onOpen={() => setOpenSrc({ src: pageImage, alt: "Страница анкеты с кнопкой связи и бронирования" })}
                    />
                </div>

                <p className="text-center font-body text-base text-white/45">
                    Так видит вашу анкету клиент на My Muse
                </p>
            </div>

            {openSrc ? <Lightbox src={openSrc.src} alt={openSrc.alt} onClose={() => setOpenSrc(null)} /> : null}
        </div>
    )
}

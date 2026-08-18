"use client";

import api, { MassageMaster } from "@/lib/api-client";
import { apiUrl } from "@/lib/api-url";
import { publicMediaUrl } from '@/lib/public-media-url';
import { useMassageMode } from "@/lib/useMassageMode";
import { CatalogPreviewRow, Profile } from "@/types/model";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function tierLabel(elite: boolean, verification: string): string {
    if (elite) return 'Элит';
    if (verification === 'verified') return 'Премиум';
    return 'VIP';
}

function buildPreviewRows(data: unknown[]): CatalogPreviewRow[] {
    const rows: CatalogPreviewRow[] = [];
    for (const raw of data) {
        if (rows.length >= 4) break;
        const m = raw as Profile;

        const image = publicMediaUrl(m.mainPhotoUrl);

        if (!image) continue;

        rows.push({
            id: m.id,
            slug: (m.slug || m.id).trim() || m.id,
            name: (m.displayName || 'Модель').trim(),
            age: m.physicalAttributes?.age ?? 0,
            city: (m.physicalAttributes?.city || '—').trim(),
            tier: tierLabel(!!m.eliteStatus, m.verificationStatus || ''),
            image,
        });
    }

    return rows;
}

interface IProps {
    initialCatalog: Profile[];
}

export const Catalog = ({ initialCatalog }: IProps) => {
    const [mastersLoading, setMastersLoading] = useState(true);
    const [masters, setMasters] = useState<MassageMaster[]>([]);

    const [catalogLoading, setCatalogLoading] = useState(!initialCatalog);
    const [catalogPreview, setCatalogPreview] = useState<CatalogPreviewRow[]>(
        () => (initialCatalog.length ? buildPreviewRows(initialCatalog) : []),
    );

    const isMassage = useMassageMode();
    const hasServerCatalog = useRef(!!initialCatalog);

    useEffect(() => {
        if (isMassage.enabled || hasServerCatalog.current) return;
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(apiUrl('/models?limit=8&orderBy=createdAt&order=desc'));    
                if (!res.ok || cancelled) return;

                const data: unknown = await res.json();
                if (!Array.isArray(data) || cancelled) return;

                if (!cancelled) setCatalogPreview(buildPreviewRows(data));
            } catch {
                if (!cancelled) setCatalogPreview([]);
            } finally {
                if (!cancelled) setCatalogLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isMassage.enabled]);

      useEffect(() => {
        if (!isMassage.enabled) return;
        let cancelled = false;
        
        api
          .getMassageMasters()
          .then((data) => {
            if (!cancelled) setMasters(data.slice(0, 4));
          })
          .catch(() => {
            if (!cancelled) setMasters([]);
          })
          .finally(() => {
            if (!cancelled) setMastersLoading(false);
          });

        return () => {
          cancelled = true;
        };
      }, [isMassage.enabled]);

    return (
        <section id="catalog" className="relative py-[35px] md:py-[70px] border-t border-white/[0.04]">
            <div className="max-w-[1200px] mx-auto px-6 md:px-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
                    <div>
                        <span className="text-[#d4af37] font-body text-xs font-semibold uppercase tracking-[0.2em]">
                            {isMassage.enabled ? 'Мастера' : 'Модели'}
                        </span>
                        <h2 className="font-display text-3xl md:text-5xl font-extrabold mt-3">
                            {isMassage.enabled ? 'Наши мастера' : 'Наши модели'}
                        </h2>
                    </div>
                    <Link
                        href="/models"
                        className="font-body text-sm text-[#d4af37] font-medium hover:underline underline-offset-4 uppercase tracking-wider"
                    >
                        Показать все &rarr;
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {isMassage.enabled ? (
                        mastersLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden animate-pulse"
                                >
                                    <div className="aspect-[3/4] bg-white/[0.06]" />
                                    <div className="p-4 space-y-2">
                                        <div className="h-4 w-2/3 rounded bg-white/[0.08]" />
                                        <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                                    </div>
                                </div>
                            ))
                        ) : !masters.length ? (
                            <p className="col-span-full text-center font-body text-sm text-white/35 py-8">
                                Пока нет опубликованных мастеров — откройте{' '}
                                <Link href="/models" className="text-[#d4af37] hover:underline">
                                    каталог
                                </Link>
                                .
                            </p>
                        ) : (
                            masters.map((master) => {
                                const image = publicMediaUrl(master.mainPhotoUrl) || 'https://placehold.co/300x400/0f0f0f/d4af37';

                                return (
                                    <Link
                                        key={master.id}
                                        href={`/models/${master.slug}`}
                                        className="group block rounded-2xl overflow-hidden border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/25 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#d4af37]/10"
                                    >
                                        <div className="relative aspect-[3/4] overflow-hidden" style={{ backgroundImage: "url('https://placehold.co/300x400/0f0f0f/d4af37')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                            <Image
                                                src={image}
                                                alt={master.displayName}
                                                fill
                                                unoptimized={image.startsWith('/pic-proxy/') || image.startsWith('/img-proxy/')}
                                                onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {master.isPopular ? (
                                                <div className="absolute top-3 right-3 badge badge-gold">Популярный мастер</div>
                                            ) : null}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-display text-sm font-bold group-hover:text-[#d4af37] transition-colors">
                                                {master.displayName}
                                            </h3>
                                            <p className="font-body text-xs text-white/35 mt-1">
                                                {master.priceFrom ? `от ${Math.round(Number(master.priceFrom)).toLocaleString('ru-RU')} ₽` : '—'}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })
                        )
                    ) : catalogLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden animate-pulse"
                            >
                                <div className="aspect-[3/4] bg-white/[0.06]" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 w-2/3 rounded bg-white/[0.08]" />
                                    <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                                </div>
                            </div>
                        ))
                    ) : !catalogPreview.length ? (
                        <p className="col-span-full text-center font-body text-sm text-white/35 py-8">
                            Пока нет опубликованных анкет — откройте{' '}
                            <Link href="/models" className="text-[#d4af37] hover:underline">
                                каталог
                            </Link>
                            .
                        </p>
                    ) : (
                        catalogPreview.map((model) => (
                            <Link
                                key={model.id}
                                href={`/models/${model.slug}`}
                                className="group block rounded-2xl overflow-hidden border border-white/[0.04] bg-white/[0.02] hover:border-[#d4af37]/25 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#d4af37]/10"
                            >
                                <div className="relative aspect-[3/4] overflow-hidden" style={{ backgroundImage: "url('https://placehold.co/300x400/0f0f0f/d4af37')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                    <Image
                                        src={model.image}
                                        alt={model.name}
                                        fill
                                        unoptimized={model.image.startsWith('/pic-proxy/') || model.image.startsWith('/img-proxy/')}
                                        onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 right-3 badge badge-gold">{model.tier}</div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                </div>
                                <div className="p-4">
                                    <h3 className="font-display text-sm font-bold group-hover:text-[#d4af37] transition-colors">
                                        {model.name}
                                    </h3>
                                    <p className="font-body text-xs text-white/35 mt-1">
                                        {model.age > 0 ? `Возраст: ${model.age}` : '—'} &middot; {model.city}
                                    </p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </section>
    )
};

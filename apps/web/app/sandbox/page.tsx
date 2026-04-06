'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'framer-motion';
import Logo from '@/components/Logo';
import { generateDemoPhotos } from '@/lib/demo-photos';
import { apiUrl } from '@/lib/api-url';
interface ModelPhoto {
  id: string;
  url: string;
}

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  eliteStatus: boolean;
  availabilityStatus: string;
  rateHourly: string | null;
  mainPhotoUrl: string | null;
  photos?: ModelPhoto[];
  physicalAttributes: {
    age?: number;
    height?: number;
    city?: string;
  } | null;
}

function coverForModel(m: ModelProfile): string | undefined {
  if (m.mainPhotoUrl) return m.mainPhotoUrl;
  const fromPhotos = m.photos?.find((p) => p.url)?.url;
  if (fromPhotos) return fromPhotos;
  return generateDemoPhotos(m.id, m.mainPhotoUrl, 1)[0];
}

const layoutSpring = { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.85 };

export default function SandboxPage() {
  const reduceMotion = useReducedMotion();
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ModelProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/models?limit=40&orderBy=rating&order=desc'));
      if (!response.ok) return;
      const data: ModelProfile[] = await response.json();
      for (const m of data) {
        const urls = generateDemoPhotos(m.id, m.mainPhotoUrl, 8);
        m.photos = urls.map((url, i) => ({ id: `p-${i}`, url }));
      }
      setModels(data);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const layoutIdFor = (id: string) => (reduceMotion ? undefined : `sandbox-cover-${id}`);

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/92 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xl">
                <Logo />
              </Link>
              <span className="font-light text-white/30">/</span>
              <h1 className="font-display text-lg font-bold text-white md:text-xl">Сэндбокс</h1>
              <span className="rounded-full border border-[#d4af37]/35 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-[#d4af37]/90">
                Framer layoutId
              </span>
            </div>
            <nav className="flex items-center gap-5">
              <Link
                href="/models"
                className="font-body text-[12px] uppercase tracking-[0.1em] text-white/40 transition-colors hover:text-[#d4af37]"
              >
                Каталог
              </Link>
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <p className="mb-6 max-w-2xl font-body text-sm leading-relaxed text-white/40">
            Та же сетка карточек, что и в каталоге. Переход без смены URL: обложка{' '}
            <strong className="font-medium text-white/55">морфит</strong> в панель детали (один экран,{' '}
            <code className="text-white/35">layoutId</code>). Это другой подход, не View Transitions API.
          </p>

          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card animate-pulse p-3">
                  <div className="mb-3 aspect-[3/4] rounded-lg bg-white/[0.05]" />
                  <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : models.length === 0 ? (
            <p className="font-body text-sm text-white/35">Нет данных — проверьте API.</p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {models.map((model) => {
                const cover = coverForModel(model);
                const isOpen = selected?.id === model.id;
                const pa = model.physicalAttributes;

                return (
                  <article
                    key={model.id}
                    className={`card cursor-pointer overflow-hidden transition-shadow hover:border-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4af37]/45 focus-visible:outline-offset-2 ${
                      model.eliteStatus ? '!border-[#d4af37]/25' : ''
                    }`}
                    onClick={() => setSelected(model)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(model);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#0a0a0a]">
                      {isOpen ? (
                        <div className="h-full w-full bg-[#121218]" aria-hidden />
                      ) : cover ? (
                        <motion.img
                          layoutId={layoutIdFor(model.id)}
                          src={cover}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          transition={layoutSpring}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl opacity-25">👤</div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    </div>
                    <div className="p-3">
                      <h2 className="font-display text-sm font-bold text-white">{model.displayName}</h2>
                      <p className="mt-1 font-body text-[11px] text-white/35">
                        {[pa?.age ? `${pa.age} лет` : null, pa?.city].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {selected ? (
            <>
              <motion.button
                key="sandbox-backdrop"
                type="button"
                aria-label="Закрыть"
                className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.22 }}
                onClick={() => setSelected(null)}
              />
              <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6 pointer-events-none">
                <motion.div
                  key="sandbox-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="sandbox-detail-title"
                  className="pointer-events-auto flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] bg-[#111] shadow-[0_-20px_60px_rgba(0,0,0,0.65)] sm:rounded-2xl sm:shadow-2xl md:max-w-4xl md:flex-row"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative w-full shrink-0 md:w-[46%] md:min-h-[min(520px,80dvh)]">
                    {(() => {
                      const cover = coverForModel(selected);
                      return cover ? (
                        <motion.img
                          layoutId={layoutIdFor(selected.id)}
                          src={cover}
                          alt=""
                          className="h-[38vh] w-full object-cover sm:h-[42vh] md:h-full md:min-h-[min(520px,80dvh)]"
                          transition={layoutSpring}
                        />
                      ) : (
                        <div className="flex h-[38vh] items-center justify-center bg-[#1a1a1a] text-5xl opacity-30 md:h-full">
                          👤
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 id="sandbox-detail-title" className="font-display text-xl font-bold text-white md:text-2xl">
                          {selected.displayName}
                        </h2>
                        <p className="mt-1 font-body text-sm text-white/40">
                          {selected.physicalAttributes?.city ?? '—'}
                          {selected.physicalAttributes?.age
                            ? ` · ${selected.physicalAttributes.age} лет`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 font-body text-xs text-white/70 transition-colors hover:border-[#d4af37]/50 hover:text-[#d4af37]"
                      >
                        Закрыть
                      </button>
                    </div>
                    {selected.rateHourly ? (
                      <p className="font-display text-lg font-bold text-[#d4af37]">{selected.rateHourly} ₽/час</p>
                    ) : null}
                    <p className="font-body text-xs leading-relaxed text-white/30">
                      Полноценная страница профиля с ripple и отзывами остаётся в основном каталоге.
                    </p>
                    <Link
                      href={`/models/${selected.slug || selected.id}`}
                      className="btn-primary mt-auto inline-flex w-fit text-center text-sm"
                    >
                      <span className="site-header-cta-enter__label !text-sm">Открыть страницу модели</span>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </>
          ) : null}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

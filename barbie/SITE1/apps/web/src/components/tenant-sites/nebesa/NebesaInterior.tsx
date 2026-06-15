'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * NebesaInterior — секция «Интерьеры», порт s-interior с nebesaspa.com:
 * масонри-сетка (паттерн 6n: 1-й/6-й широкие, остальные узкие), фрост-стекло
 * обёртка, декоративное облако в углу, клик по фото → лайтбокс (замена fancybox).
 * 5 фото скачаны с живого сайта → public/tenants/nebesaspa/interior/*.webp.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const IMGS = [1, 2, 3, 4, 5].map((n) => `${BASE}/tenants/nebesaspa/interior/${n}.webp`);
const CLOUD = `${BASE}/tenants/nebesaspa/clouds/cloud-2.webp`;

export function NebesaInterior() {
  const t = useTranslations('nebesa');
  const tc = useTranslations('common');
  const [box, setBox] = useState<number | null>(null);

  useEffect(() => {
    if (box === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBox(null);
      else if (e.key === 'ArrowRight') setBox((b) => (b === null ? b : (b + 1) % IMGS.length));
      else if (e.key === 'ArrowLeft') setBox((b) => (b === null ? b : (b - 1 + IMGS.length) % IMGS.length));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [box]);

  return (
    <section className="intr" id="interior">
      <div className="wrap">
        <div className="intr-box">
          <div className="intr-wrap">
            <h2 className="intr-title">{tc('nav.interiors')}</h2>
            <div className="intr-grid">
              {IMGS.map((src, i) => (
                <button key={i} className="intr-cell" onClick={() => setBox(i)} aria-label={t('interiorComp.cellAria', { n: i + 1 })}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
          <img className="intr-cloud" src={CLOUD} alt="" aria-hidden />
        </div>
      </div>

      {box !== null && (
        <div className="intr-lb" onClick={() => setBox(null)}>
          <button className="intr-lb-x" aria-label={t('interiorComp.close')} onClick={() => setBox(null)}>
            ×
          </button>
          <button
            className="intr-lb-nav prev"
            aria-label={t('interiorComp.prev')}
            onClick={(e) => {
              e.stopPropagation();
              setBox((b) => (b === null ? b : (b - 1 + IMGS.length) % IMGS.length));
            }}
          >
            ‹
          </button>
          <img className="intr-lb-img" src={IMGS[box]} alt="" onClick={(e) => e.stopPropagation()} />
          <button
            className="intr-lb-nav next"
            aria-label={t('interiorComp.next')}
            onClick={(e) => {
              e.stopPropagation();
              setBox((b) => (b === null ? b : (b + 1) % IMGS.length));
            }}
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}

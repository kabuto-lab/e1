'use client';

import '@/styles/barbiespa.css';
import { useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { BarbieMasterCard } from './BarbieMasterCard';

/**
 * BarbieModels — раздел «Анкеты» тенанта barbiespa в фирменном стиле
 * (сетка .m-grid из BarbieMasterCard + видео-лайтбокс), вместо общего
 * мульти-тенантного TenantModelsPage, который выбивался из дизайна.
 * Рендерится внутри BarbieArticleShell (общий хедер/меню + футер).
 */
export function BarbieModels({ girls }: { girls: PublicGirl[] }) {
  const [lbVideo, setLbVideo] = useState<string | null>(null);

  return (
    <section className="wrap bs-models">
      <h1 className="sec-title">Наши анкеты</h1>
      <p className="bs-models-sub">Реальные мастера релакса Barbie Spa — фото и параметры из нашего каталога</p>

      {girls.length ? (
        <div className="m-grid">
          {girls.map((g) => (
            <BarbieMasterCard key={g.slug} girl={g} onPlay={setLbVideo} />
          ))}
        </div>
      ) : (
        <p className="bs-models-empty">Анкеты обновляются. Уточните доступных мастеров у администратора.</p>
      )}

      {lbVideo && (
        <div
          className="bs-site-lb"
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName !== 'VIDEO') setLbVideo(null);
          }}
        >
          <span className="x" onClick={() => setLbVideo(null)}>
            ×
          </span>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={lbVideo} controls playsInline autoPlay />
        </div>
      )}
    </section>
  );
}

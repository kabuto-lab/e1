'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * NebesaGirlCard — карточка анкеты NEBOSVOD в фирменном стиле (.gcard), но
 * интерактивная: слайдер по ВСЕМ фото (клик/точки) + видео (▶ → лайтбокс) +
 * VIP-бейдж. Паритет с barbiespa (BarbieMasterCard). Заменил hover-flip,
 * который показывал лишь 2 фото и не имел видео.
 */
export function NebesaGirlCard({ girl }: { girl: PublicGirl }) {
  const tc = useTranslations('common');
  const photos = girl.photos ?? [];
  const has = photos.length;
  const [cur, setCur] = useState(0);
  const [lb, setLb] = useState<string | null>(null);
  const video = girl.videos?.[0];
  const go = (n: number) => {
    if (has) setCur(((n % has) + has) % has);
  };

  return (
    <article className="gcard">
      <div className="pic gslider" onClick={() => go(cur + 1)}>
        {photos.map((p, idx) => (
          <div className={`gslide${idx === cur ? ' on' : ''}`} key={idx}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(p)} alt={girl.name} loading="lazy" referrerPolicy="no-referrer" />
          </div>
        ))}
        {girl.silicon && <span className="gvip">VIP</span>}
        {video && (
          <button
            className="gplay"
            aria-label="Смотреть видео"
            onClick={(e) => {
              e.stopPropagation();
              setLb(photoUrl(video));
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        {has > 1 && (
          <div className="gdots">
            {photos.map((_, idx) => (
              <i
                key={idx}
                className={idx === cur ? 'on' : ''}
                onClick={(e) => {
                  e.stopPropagation();
                  go(idx);
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="nm">
        {girl.name}
        {girl.age ? <span style={{ color: 'var(--muted)', fontWeight: 600 }}> {girl.age}</span> : null}
      </div>
      <div className="meta">
        {girl.breast != null && (
          <span>
            {tc('meta.breast')}
            <b>{girl.breast}</b>
          </span>
        )}
        {girl.weight != null && (
          <span>
            {tc('meta.weight')}
            <b>{girl.weight}</b>
          </span>
        )}
        {girl.height != null && (
          <span>
            {tc('meta.height')}
            <b>{girl.height}</b>
          </span>
        )}
      </div>

      {lb && (
        <div
          className="neb-vlb"
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName !== 'VIDEO') setLb(null);
          }}
        >
          <button className="neb-vlb-x" aria-label="Закрыть" onClick={() => setLb(null)}>
            ×
          </button>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={lb} controls playsInline autoPlay />
        </div>
      )}
    </article>
  );
}

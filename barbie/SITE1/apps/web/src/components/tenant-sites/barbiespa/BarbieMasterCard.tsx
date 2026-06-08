'use client';

import { useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * BarbieMasterCard — карточка мастера в сетке (порт .m-card из прототипа).
 * Слайдер фото по клику/точкам; VIP-бейдж (по silicon); play → видео-лайтбокс.
 */
export function BarbieMasterCard({
  girl,
  onPlay,
}: {
  girl: PublicGirl;
  onPlay: (src: string) => void;
}) {
  const photos = girl.photos ?? [];
  const has = photos.length;
  const [cur, setCur] = useState(0);
  const go = (n: number) => {
    if (has) setCur(((n % has) + has) % has);
  };
  const video = girl.videos?.[0];

  return (
    <div className="m-card">
      <div className="m-media" onClick={() => go(cur + 1)}>
        <div className="wm">BARBIE</div>
        {photos.map((p, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={idx}
            className={`slide${idx === cur ? ' active' : ''}`}
            src={photoUrl(p)}
            loading="lazy"
            alt={girl.name}
          />
        ))}
        {girl.silicon && <div className="m-vip">VIP</div>}
        {video && (
          <div
            className="m-play"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(photoUrl(video));
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        {has > 1 && (
          <div className="m-dots">
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
      <div className="m-name">
        {girl.name}
        {girl.age ? `, ${girl.age}` : ''}
      </div>
      <div className="m-params">
        {girl.height != null && (
          <span>
            Рост <b>{girl.height}</b>
          </span>
        )}
        {girl.weight != null && (
          <span>
            Вес <b>{girl.weight}</b>
          </span>
        )}
        {girl.breast != null && (
          <span>
            Грудь <b>{girl.breast}</b>
            {girl.silicon ? <span className="sil"> silicon</span> : ''}
          </span>
        )}
      </div>
    </div>
  );
}

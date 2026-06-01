'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * SmProfileStage — интерактивная сцена профиля модели (классы .pstage/.pthumbs/
 * .lb из _style.css). Миниатюра справа переключает главное фото; клик по
 * главному фото открывает лайтбокс (стрелки/Esc). Реплика поведения app.js.
 */
export function SmProfileStage({ girl }: { girl: PublicGirl }) {
  const photos = girl.photos;
  const [cur, setCur] = useState(0);
  const [lb, setLb] = useState(false);

  const main = photos[cur] ?? '';

  const step = useCallback(
    (dir: number) => setCur((c) => (photos.length ? (c + dir + photos.length) % photos.length : 0)),
    [photos.length],
  );

  useEffect(() => {
    if (!lb) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLb(false);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lb, step]);

  return (
    <>
      <main className="profile2">
        <div className="pstage">
          <div
            className="pmain"
            style={{ backgroundImage: main ? `url('${photoUrl(main)}')` : undefined, cursor: 'zoom-in' }}
            onClick={() => photos.length && setLb(true)}
          />
          <a className="pclose" href="/imperiumspa" aria-label="Закрыть">×</a>

          <div className="pinfo">
            <a className="back" href="/imperiumspa/models">← все анкеты</a>
            <h1 className="pname">
              {girl.name}
              {girl.age != null && <em>{girl.age}</em>}
            </h1>
            <div className="prm">
              {girl.height != null && (
                <div className="prm-i"><div className="prm-v">{girl.height}</div><div className="prm-k">рост</div></div>
              )}
              {girl.weight != null && (
                <div className="prm-i"><div className="prm-v">{girl.weight}</div><div className="prm-k">вес</div></div>
              )}
              {girl.breast != null && (
                <div className="prm-i"><div className="prm-v">{girl.breast}</div><div className="prm-k">грудь</div></div>
              )}
              {girl.silicon && (
                <div className="prm-i"><div className="prm-v">✓</div><div className="prm-k">силикон</div></div>
              )}
            </div>
            <a href="/imperiumspa#contacts" className="shiny-cta">
              <i className="blind" />
              <span>Записаться — {girl.name}</span>
            </a>
          </div>

          {photos.length > 0 && (
            <div className="pthumbs">
              {photos.map((p, i) => (
                <div
                  key={p}
                  className={`pthumb${i === cur ? ' on' : ''}`}
                  style={{ backgroundImage: `url('${photoUrl(p)}')` }}
                  onClick={() => setCur(i)}
                  role="button"
                  aria-label={`Фото ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <div className={`lb${lb ? ' on' : ''}`} onClick={() => setLb(false)}>
        <span className="lbx" onClick={(e) => { e.stopPropagation(); setLb(false); }}>×</span>
        {photos.length > 1 && (
          <>
            <span className="lbn lbprev" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</span>
            <span className="lbn lbnext" onClick={(e) => { e.stopPropagation(); step(1); }}>›</span>
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {main && <img src={photoUrl(main)} alt={girl.name} onClick={(e) => e.stopPropagation()} />}
      </div>
    </>
  );
}

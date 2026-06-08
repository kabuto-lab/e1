'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * MagazineSpread — секция «Откровенный показ за стеклом» как физический журнал:
 * ЛЕВАЯ страница статична, ПРАВАЯ перелистывается трёхмерным листом (rotateY
 * вокруг корешка-петли слева, справа налево; обратная сторона скрыта,
 * открывая следующее фото под листом).
 *
 * Показываем ТОЛЬКО фото без водяного знака. В общем каталоге model-library
 * часть обложек — донорские с лого «BARBIE SPA»; чистые (заменены батчем
 * 2026-06-08) — это набор ниже. Пометки watermark в API нет, поэтому пул
 * задаётся явным allowlist'ом чистых slug'ов.
 */
const CLEAN_SLUGS = new Set([
  'astra', 'avgustina', 'dayzi', 'dora', 'jiji', 'kelli', 'kylie', 'leya',
  'liza', 'malina', 'shakira', 'sharil', 'sheyla', 'treyci', 'vera', 'zlata',
]);

export function MagazineSpread({
  girls,
  intervalMs = 3800,
}: {
  girls: PublicGirl[];
  /** Период перелистывания правого листа, мс. */
  intervalMs?: number;
}) {
  // Перемешанный пул чистых обложек (одна на девушку), стабильный на маунт.
  const photos = useMemo(() => {
    const covers = girls
      .filter((g) => CLEAN_SLUGS.has(g.slug))
      .map((g) => g.photos?.[0])
      .filter(Boolean) as string[];
    const arr = [...covers];
    for (let k = arr.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[j]] = [arr[j], arr[k]];
    }
    return arr;
  }, [girls]);

  const [i, setI] = useState(0);

  // Правый лист крутит весь пул, КРОМЕ первого фото (оно закреплено за левой
  // статичной страницей), чтобы страницы не дублировались.
  const rightPool = photos.length > 1 ? photos.slice(1) : photos;

  useEffect(() => {
    if (rightPool.length < 2) return;
    const id = setInterval(() => setI((v) => v + 1), intervalMs);
    return () => clearInterval(id);
  }, [rightPool.length, intervalMs]);

  // Фолбэк: чистых фото нет — оставляем прежний сиреневый разворот.
  if (photos.length === 0) {
    return (
      <>
        <div style={{ background: 'linear-gradient(160deg,#3a2436,#1a1020)' }} />
        <div style={{ background: 'linear-gradient(160deg,#4a2358,#1a1020)' }} />
      </>
    );
  }

  const leftPhoto = photos[0];
  const m = rightPool.length;
  const rightBase = rightPool[i % m];
  const rightLeaf = rightPool[(i - 1 + m) % m];

  return (
    <>
      {/* Левая страница — статична */}
      <div className="mag mag-left">
        <img className="mag-base" referrerPolicy="no-referrer" src={photoUrl(leftPhoto)} alt="" />
      </div>

      {/* Правая страница — перелистывается трёхмерным листом */}
      <div className="mag mag-right">
        <img className="mag-base" referrerPolicy="no-referrer" src={photoUrl(rightBase)} alt="" />
        {i > 0 && (
          <div className="mag-leaf" key={i}>
            <img referrerPolicy="no-referrer" src={photoUrl(rightLeaf)} alt="" />
            <span className="mag-leaf-shade" />
          </div>
        )}
      </div>
    </>
  );
}

'use client';

import { useId } from 'react';

/**
 * RainbowRing — сегментированное вращающееся радужное кольцо вокруг аватара.
 *
 * Реализация (вариант с явными сегментами): один <circle> с радужной градиентной
 * обводкой + анимация stroke-dasharray (видимые штрихи, которые «дышат») + вращение.
 * pathLength=100 → длина штрихов задаётся в процентах окружности и не зависит от
 * радиуса. Декоративный: pointer-events:none + aria-hidden.
 *
 * Классы/keyframes — в nebesa.css (.rrc-ring, scoped под .nebesa-site).
 */
export function RainbowRing() {
  const uid = useId().replace(/:/g, '');
  const grad = `rrc-grad-${uid}`;

  return (
    <svg className="rrc" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={grad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="gold" />
          <stop offset="35%" stopColor="tomato" />
          <stop offset="65%" stopColor="deeppink" />
          <stop offset="100%" stopColor="mediumorchid" />
        </linearGradient>
      </defs>
      <circle className="rrc-ring" cx="50" cy="50" r="45" pathLength={100} stroke={`url(#${grad})`} />
    </svg>
  );
}

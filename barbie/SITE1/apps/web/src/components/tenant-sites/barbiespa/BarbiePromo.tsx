'use client';

import { useEffect, useState } from 'react';

/**
 * BarbiePromo — промо-попап «Счастливые часы» на входе в тенант barbiespa.
 * Показывается один раз за СЕССИЮ (sessionStorage) с небольшой задержкой.
 * z-index НИЖЕ age-gate (3000): на первом визите сперва 18+, после согласия —
 * промо. Закрывается крестиком, кликом по фону или кнопкой «Подробнее».
 */
const KEY = 'barbiespa_promo_seen';

export function BarbiePromo() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(KEY) === '1';
    } catch {
      /* приватный режим */
    }
    if (seen) return;
    const t = setTimeout(() => {
      setShow(true);
      try {
        window.sessionStorage.setItem(KEY, '1');
      } catch {
        /* приватный режим — покажем ещё раз в след. сессии */
      }
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const close = () => setShow(false);

  return (
    <div
      className="bs-promo"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bs-promo-title"
      onClick={close}
    >
      <div className="bs-promo-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bs-promo-close" aria-label="Закрыть" onClick={close}>
          ×
        </button>
        <div className="bs-promo-badge">Акция</div>
        <h2 className="bs-promo-title" id="bs-promo-title">
          Счастливые часы!
        </h2>
        <p className="bs-promo-text">
          Каждую неделю с воскресенья по четверг объявляем «счастливые часы»!
        </p>
        <p className="bs-promo-text">
          Посетите наш салон с 13:00 до 20:00 и выберите один из 5 подарков на выбор!
        </p>
        <p className="bs-promo-text bs-promo-accent">Такого у нас ещё никогда не было!</p>
        <a href="#contacts" className="btn-fill bs-promo-btn" onClick={close}>
          Подробнее
        </a>
      </div>
    </div>
  );
}

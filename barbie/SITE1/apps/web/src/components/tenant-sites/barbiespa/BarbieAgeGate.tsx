'use client';

import { useEffect, useState } from 'react';

/**
 * BarbieAgeGate — возрастной барьер 18+ на входе в тенант barbiespa.
 * Логика повторяет проверенный shared AgeGate / NebesaAgeGate: выбор
 * запоминается в localStorage (показ один раз), фон скроллить нельзя, SSR-safe
 * (до маунта рендерит null — нет мигания у согласившихся). Рендерится внутри
 * .bs-site, поэтому использует фирменные кнопки (.btn-fill/.btn-out) и шрифты.
 */

const KEY = 'barbiespa_age_ok';

export function BarbieAgeGate() {
  // null — ещё не проверили (SSR / до маунта); true — показать; false — скрыть.
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(KEY) !== '1');
    } catch {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (show !== true) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (show !== true) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* приватный режим — скрываем на сессию */
    }
    setShow(false);
  };

  const decline = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="bs-agegate" role="dialog" aria-modal="true" aria-labelledby="bs-agegate-title">
      <div className="bs-agegate-card">
        <div className="bs-agegate-logo display">
          <span className="b">BARBIE</span>
          <span className="s">SPA</span>
        </div>
        <div className="bs-agegate-badge">18+</div>
        <h2 className="bs-agegate-title" id="bs-agegate-title">
          Вам уже есть 18 лет?
        </h2>
        <p className="bs-agegate-text">
          Сайт содержит материалы, предназначенные для лиц старше 18 лет.
          Подтвердите своё совершеннолетие, чтобы продолжить.
        </p>
        <div className="bs-agegate-btns">
          <button type="button" className="btn-fill" onClick={accept}>
            Да, мне есть 18
          </button>
          <button type="button" className="btn-out" onClick={decline}>
            Мне нет 18
          </button>
        </div>
      </div>
    </div>
  );
}

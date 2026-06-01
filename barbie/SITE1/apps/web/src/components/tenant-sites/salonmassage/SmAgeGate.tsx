'use client';

import { useEffect, useState } from 'react';

/**
 * SmAgeGate — 18+ шлюз реплики SalonMassage (классы .agegate из _style.css).
 * SSR-safe: до маунта null (нет хидрейшн-конфликта). localStorage['sm_age_ok'].
 */
export function SmAgeGate() {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setShow(window.localStorage.getItem('sm_age_ok') !== '1');
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
      window.localStorage.setItem('sm_age_ok', '1');
    } catch {
      /* приватный режим */
    }
    setShow(false);
  };

  return (
    <div className="agegate" role="dialog" aria-modal="true" aria-label="18+">
      <div className="agegate-box">
        <div className="agegate-mark">
          18<span>+</span>
        </div>
        <div className="agegate-title">Только для совершеннолетних</div>
        <p className="agegate-text">
          Сайт содержит материалы, предназначенные для лиц старше 18 лет.
          Подтвердите свой возраст, чтобы продолжить.
        </p>
        <div className="agegate-btns">
          <button type="button" className="shiny-cta" onClick={accept}>
            <i className="blind" />
            <span>Мне уже есть 18+</span>
          </button>
          <button
            type="button"
            className="agegate-no"
            onClick={() => {
              window.location.href = 'about:blank';
            }}
          >
            Мне ещё нет 18
          </button>
        </div>
        <div className="agegate-note">
          Нажимая «Мне уже есть 18+», вы подтверждаете своё совершеннолетие и согласие с правилами сайта.
        </div>
      </div>
    </div>
  );
}

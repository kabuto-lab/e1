'use client';

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';

/**
 * NebesaAgeGate — возрастной барьер 18+ на входе в тенант НЕБОСВОД.
 * Показывается один раз (выбор запоминается в localStorage). «Да» — закрыть и
 * продолжить; «Нет» — увести с сайта. Рендерится внутри .nebesa-site, поэтому
 * использует фирменные кнопки/шрифты тенанта.
 */

const KEY = 'nebesa-age-ok';

export function NebesaAgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  // блокируем прокрутку фона, пока открыт барьер
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  function confirm() {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  function deny() {
    window.location.href = 'https://www.google.com';
  }

  return (
    <div className="agegate" role="dialog" aria-modal="true" aria-labelledby="agegate-title">
      <div className="agegate-card">
        <img className="agegate-logo" src={asset('/tenants/nebesaspa/nebesalogo2.svg')} alt="НЕБОСВОД" />
        <h2 className="agegate-title" id="agegate-title">
          Вам уже есть 18?
        </h2>
        <p className="agegate-text">
          Сайт содержит материалы для взрослых (18+). Пожалуйста, подтвердите свой возраст,
          чтобы продолжить.
        </p>
        <div className="agegate-btns">
          <button type="button" className="btn btn-blue" onClick={confirm}>
            Да, мне есть 18
          </button>
          <button type="button" className="btn btn-ghost" onClick={deny}>
            Нет
          </button>
        </div>
        <p className="agegate-note">Салон не оказывает услуги интимного характера.</p>
      </div>
    </div>
  );
}

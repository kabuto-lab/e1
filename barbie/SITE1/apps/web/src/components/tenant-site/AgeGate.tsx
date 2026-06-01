'use client';

import { useEffect, useState } from 'react';

/**
 * AgeGate — модалка 18+ для сайтов тенантов (порт со статики salonmassage).
 *
 * Проверяет localStorage[storageKey]; если согласия нет — показывает
 * полноэкранный оверлей с подтверждением возраста. «Мне есть 18» → пишет флаг
 * и скрывает; «Нет» → уводит на about:blank (мягкий выход).
 *
 * SSR-safe: до маунта рендерит null (нет доступа к localStorage), решение
 * принимается на клиенте — оверлей не мигает у согласившихся пользователей,
 * т.к. до проверки ничего не показываем.
 */
export function AgeGate({ storageKey = 'sm_age_ok' }: { storageKey?: string }) {
  // null — ещё не проверили (SSR / до маунта); true — показать гейт; false — скрыть.
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(storageKey) !== '1');
    } catch {
      setShow(true);
    }
  }, [storageKey]);

  // Блокируем скролл фона пока гейт открыт.
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
      window.localStorage.setItem(storageKey, '1');
    } catch {
      /* приватный режим — просто скрываем на сессию */
    }
    setShow(false);
  };

  const decline = () => {
    window.location.href = 'about:blank';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Подтверждение возраста"
      className="fixed inset-0 z-[3000] flex items-center justify-center p-6"
      style={{ background: 'rgba(8,7,6,0.94)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="max-w-md w-full text-center px-8 py-10 rounded-lg"
        style={{
          background: 'var(--bg, #0B0A09)',
          border: '1px solid color-mix(in srgb, var(--acc-color, #C9A86A) 40%, transparent)',
          color: 'var(--body-color, #D8D4CC)',
        }}
      >
        <div
          className="text-5xl font-bold mb-5"
          style={{ color: 'var(--acc-color, #C9A86A)', fontFamily: "var(--head-font, 'Playfair Display')" }}
        >
          18<span className="text-3xl align-top">+</span>
        </div>
        <h2
          className="text-xl mb-3"
          style={{ fontFamily: "var(--head-font, 'Playfair Display')", color: 'var(--head-color, #F5F1E8)' }}
        >
          Только для совершеннолетних
        </h2>
        <p className="text-sm opacity-75 mb-7 leading-relaxed">
          Сайт содержит материалы, предназначенные для лиц старше 18 лет.
          Подтвердите, что вам уже исполнилось 18.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={accept}
            className="w-full py-3 rounded-md font-medium tracking-wide transition-opacity hover:opacity-90"
            style={{ background: 'var(--acc-color, #C9A86A)', color: 'var(--bg, #0B0A09)' }}
          >
            Мне уже есть 18+
          </button>
          <button
            onClick={decline}
            className="w-full py-3 rounded-md text-sm transition-colors"
            style={{
              border: '1px solid color-mix(in srgb, var(--body-color, #D8D4CC) 25%, transparent)',
              color: 'var(--body-color, #D8D4CC)',
            }}
          >
            Мне нет 18
          </button>
        </div>
      </div>
    </div>
  );
}

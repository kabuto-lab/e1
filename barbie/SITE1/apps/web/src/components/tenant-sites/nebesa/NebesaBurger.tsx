'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { asset } from '@/lib/asset';

/**
 * NebesaBurger — мобильное бургер-меню тенанта nebesaspa (НЕБОСВОД).
 * Кнопка видна только на телефоне (CSS .neb-burger, ≤680px); по клику справа
 * выезжает off-canvas панель (.neb-drawer) с навигацией и контактами.
 *
 * Панель и затемнение РЕНДЕРЯТСЯ В <body> через портал: у шапки .hdr стоит
 * backdrop-filter, который делает её containing-block для position:fixed —
 * без портала off-canvas «застревал» внутри хедера. Кнопка остаётся в шапке.
 */

type NavItem = [href: string, label: string];

export function NebesaBurger({
  nav,
  phone,
  phoneHref,
  tgUrl,
  waUrl,
}: {
  nav: NavItem[];
  phone: string;
  phoneHref: string;
  tgUrl: string;
  waUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // блокируем скролл фона, пока панель открыта
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);

  const drawer = (
    <div className="nebesa-site">
      <div
        className={`neb-drawer-overlay${open ? ' is-open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
      <aside className={`neb-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <button type="button" className="neb-drawer-close" aria-label="Закрыть меню" onClick={close}>
          ×
        </button>
        <nav className="neb-drawer-nav">
          {nav.map(([href, label]) => (
            <a key={href} href={asset(href)} onClick={close}>
              {label}
            </a>
          ))}
        </nav>
        <div className="neb-drawer-foot">
          <a className="neb-drawer-phone" href={phoneHref}>
            {phone}
          </a>
          <a className="btn btn-blue" href={phoneHref} onClick={close}>
            Записаться
          </a>
          <div className="neb-drawer-soc">
            <a href={tgUrl} target="_blank" rel="noopener noreferrer">
              Telegram
            </a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="neb-burger"
        aria-label="Открыть меню"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>

      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}

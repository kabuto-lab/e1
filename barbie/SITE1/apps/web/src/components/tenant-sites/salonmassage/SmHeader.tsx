'use client';

import { useState } from 'react';

/**
 * SmHeader — шапка реплики SalonMassage (классы .sm-header/.nav из _style.css).
 * Бургер-меню (мобайл) переключает класс .open на хедере. Переключатель языков —
 * UI присутствует (RU активен), функциональный i18n отложен.
 */
export function SmHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className={`sm-header${open ? ' open' : ''}`}>
      <div className="wrap nav">
        <a className="logo" href="#top" onClick={() => setOpen(false)}>
          SALON<b>&middot;</b>MASSAGE
        </a>
        <ul className="navmenu">
          <li><a href="#services" onClick={() => setOpen(false)}>Услуги</a></li>
          <li><a href="/imperiumspa/models" onClick={() => setOpen(false)}>Анкеты</a></li>
          <li><a href="#advantages" onClick={() => setOpen(false)}>О нас</a></li>
          <li><a href="#contacts" onClick={() => setOpen(false)}>Контакты</a></li>
        </ul>
        <div className="spacer" />
        <div className="langsw">
          <button type="button" className="on" data-lang="ru">RU</button>
          <button type="button" data-lang="en">EN</button>
          <button type="button" data-lang="zh">中</button>
        </div>
        <button
          type="button"
          className="burger"
          aria-label="Меню"
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
        <a href="#contacts" className="navbook" onClick={() => setOpen(false)}>
          <span className="cta-swap">
            <span className="cta-book">Записаться</span>
            <span className="cta-hi">Привет</span>
          </span>
        </a>
      </div>
    </header>
  );
}

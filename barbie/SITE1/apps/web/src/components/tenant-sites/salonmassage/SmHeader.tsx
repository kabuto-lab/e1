'use client';

import { asset } from '@/lib/asset';
import { useState } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * SmHeader — шапка реплики SalonMassage (классы .sm-header/.nav из _style.css).
 * Бургер-меню (мобайл) переключает класс .open на хедере. Переключатель языков —
 * UI присутствует (RU активен), функциональный i18n отложен.
 */
export function SmHeader({ base = 'imperiumspa' }: { base?: string } = {}) {
  const [open, setOpen] = useState(false);

  return (
    <header className={`sm-header${open ? ' open' : ''}`}>
      <div className="wrap nav">
        <a className="logo" href="#top" onClick={() => setOpen(false)}>
          SALON<b>&middot;</b>MASSAGE
        </a>
        <ul className="navmenu">
          <li><a href={asset(`/${base}#services`)} onClick={() => setOpen(false)}>Услуги</a></li>
          <li><a href={asset(`/${base}/models`)} onClick={() => setOpen(false)}>Анкеты</a></li>
          {/* Сквозные глобальные разделы (Class-G) — одинаковы на всех салонах */}
          <li><a href={asset(`/${base}/malchishnik`)} onClick={() => setOpen(false)}>Мальчишник</a></li>
          <li><a href={asset(`/${base}/vyezd`)} onClick={() => setOpen(false)}>Выезд</a></li>
          <li><a href="https://5massage.com" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Сертификаты</a></li>
          <li><a href={asset(`/${base}/vacancies`)} onClick={() => setOpen(false)}>Вакансии</a></li>
          <li><a href={asset(`/${base}#contacts`)} onClick={() => setOpen(false)}>Контакты</a></li>
        </ul>
        <div className="spacer" />
        <div className="langsw">
          <LangSwitcher accent="#c8a96a" />
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

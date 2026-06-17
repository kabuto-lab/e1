import '@/styles/barbiespa.css';
import type { ReactNode } from 'react';
import { asset } from '@/lib/asset';
import { montserrat, manrope } from './fonts';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * BarbieArticleShell — обёртка страниц раздела «Статьи» тенанта barbiespa:
 * фирменная тема .bs-site (шрифты, цвета) + компактная шапка (лого → главная,
 * «Главная», переключатель языка) + футер. Без видео-hero/меню-дровера главной.
 */
export function BarbieArticleShell({ children }: { children: ReactNode }) {
  return (
    <div className={`bs-site bs-art ${montserrat.variable} ${manrope.variable}`} id="top">
      <header className="bs-header solid bs-art-header">
        <a href={asset('/barbiespa')} className="logo">
          <div className="b display">BARBIE</div>
          <div className="s">SPA</div>
        </a>
        <div className="bs-art-hr">
          <a href={asset('/barbiespa')} className="bs-art-back">← Главная</a>
          <span className="bs-lang">
            <LangSwitcher accent="#ec1c8f" />
          </span>
        </div>
      </header>

      <main className="bs-art-main">{children}</main>

      <footer className="bs-footer">
        <div className="wrap f-grid">
          <div>
            <a href={asset('/barbiespa')}>Главная</a>
            <a href={asset('/barbiespa/stati')}>Статьи</a>
            <a href={asset('/barbiespa/models')}>Анкеты</a>
          </div>
          <div>
            <a href={asset('/barbiespa/programmy')}>Программы</a>
            <a href={asset('/barbiespa#contacts')}>Контакты</a>
          </div>
          <div className="f-logo">
            <div className="b display">BARBIE</div>
            <div className="s">SPA</div>
            <div className="copy">© 2026 · Barbie spa Салон</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

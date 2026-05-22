/**
 * EdRenderer — публичный рантайм-рендерер документа ED.
 *
 * Берёт дерево `Section[]` (собранное в `SandboxEditor`, сохранённое в
 * `cms_pages.body`) и рендерит публичный HTML — без chrome редактора
 * (без drop-зон, выделения, hover, палитры виджетов).
 *
 * Без 'use client' и без хуков → рендерится на сервере (SSR).
 *
 * M1: `elStyle.customCss` игнорируется (решение Level 1 #5); виджеты —
 * через общий `WidgetView` в режиме 'render'.
 */
import type { ReactElement } from 'react';
import { WidgetView } from './WidgetView';
import { defaultElStyle, type Section } from './ed-types';

/**
 * Извлекает дерево ED из тела CMS-страницы.
 *
 * ED сохраняется одним блоком `{ type: 'custom', data: { ed: Section[] } }`
 * внутри `cms_pages.body`. Возвращает `[]`, если блока нет или форма
 * неожиданная — рендерер устойчив к чужому/пустому body.
 */
export function extractEdSections(body: unknown): Section[] {
  if (!Array.isArray(body)) return [];
  for (const block of body) {
    if (block && typeof block === 'object' && (block as { type?: unknown }).type === 'custom') {
      const data = (block as { data?: unknown }).data;
      const ed = data && typeof data === 'object' ? (data as { ed?: unknown }).ed : undefined;
      if (Array.isArray(ed)) return ed as Section[];
    }
  }
  return [];
}

export function EdRenderer({ sections }: { sections: Section[] }): ReactElement {
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} style={{ padding: section.padding }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {section.columns.map((column) => (
              <div key={column.id} style={{ flex: column.span, minWidth: 0 }}>
                {column.elements.map((el) => {
                  const s = el.elStyle ?? defaultElStyle();
                  return (
                    <div
                      key={el.id}
                      style={{
                        padding: `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
                        background: s.background || 'transparent',
                        borderRadius: s.borderRadius,
                        opacity: s.opacity / 100,
                      }}
                    >
                      <WidgetView el={el} mode="render" />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

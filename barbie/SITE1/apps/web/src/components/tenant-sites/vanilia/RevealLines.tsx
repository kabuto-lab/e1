'use client';

import React, { useEffect, useRef, useState } from 'react';

type RevealLinesProps = {
  children: React.ReactNode;
  /** тег обёртки (h2/h3/p/...) */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** задержка между визуальными строками, сек */
  step?: number;
  /** доля видимости для старта (IntersectionObserver threshold) */
  threshold?: number;
};

/**
 * RevealLines — построчное всплытие текста при доскролле во вьюпорт.
 *
 * Текст бьётся на слова (inline-block), вложенные элементы оборачиваются как
 * одно «слово», <br> пропускается как разрыв строки. После раскладки измеряется
 * offsetTop каждого слова: словам одной ВИЗУАЛЬНОЙ строки назначается общая
 * transition-delay, поэтому строки всплывают последовательно (а не по буквам).
 *
 * Скрытие/анимация только под `html.js` (см. vanilia.css) — без JS текст виден,
 * мерцания нет. Пересчёт строк на resize (перенос/смена ширины/догрузка шрифта).
 */
export function RevealLines({
  children,
  as = 'div',
  className,
  step = 0.12,
  threshold = 0.25,
}: RevealLinesProps) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // Назначить задержки по визуальным строкам (группировка слов по offsetTop).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const assign = () => {
      const words = el.querySelectorAll<HTMLElement>('.rwd');
      let lineTop: number | null = null;
      let line = -1;
      words.forEach((w) => {
        const top = w.offsetTop;
        if (lineTop === null || Math.abs(top - lineTop) > 4) {
          line += 1;
          lineTop = top;
        }
        w.style.transitionDelay = `${(line * step).toFixed(3)}s`;
      });
    };
    assign();
    const ro = new ResizeObserver(assign);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, step]);

  // Старт анимации при попадании во вьюпорт (один раз).
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold]);

  // Разбивка children: строки → слова, <br> → разрыв, прочие элементы → одно «слово».
  const out: React.ReactNode[] = [];
  let k = 0;
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      String(child)
        .split(/(\s+)/)
        .forEach((part) => {
          if (part === '') return;
          if (/^\s+$/.test(part)) {
            out.push(' ');
          } else {
            out.push(
              <span className="rwd" key={`w${k++}`}>
                {part}
              </span>,
            );
          }
        });
    } else if (React.isValidElement(child)) {
      if (child.type === 'br') {
        out.push(React.cloneElement(child, { key: `b${k++}` }));
      } else {
        out.push(
          <span className="rwd" key={`e${k++}`}>
            {child}
          </span>,
        );
      }
    }
  });

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`ln-reveal${className ? ` ${className}` : ''}${inView ? ' in' : ''}`}
    >
      {out}
    </Tag>
  );
}

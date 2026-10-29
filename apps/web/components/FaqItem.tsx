'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** Тайминг раскрытия — DESIGN.md: motion medium (300ms) + --ease-move. */
const FAQ_EASE = 'ease-[cubic-bezier(0.4,0,0.2,1)]';

/**
 * Пункт FAQ с плавным раскрытием. Нативный <details> не анимируется (контент появляется
 * скачком и удаляется из потока при закрытии), поэтому высота панели задаётся из состояния:
 * закрыто — 0, открыто — измеренная высота содержимого (ResizeObserver пересчитывает при
 * изменении ширины/шрифтов). Так анимируются оба направления, а текст всегда в DOM.
 */
export function FaqItem({ question, answer }: { question: string; answer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const panelId = useId();

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.scrollHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      <h3>
        <button
          type="button"
          id={`${panelId}-trigger`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left font-display text-base font-semibold text-white transition-colors duration-200 hover:text-[#d4af37] focus:outline-none focus-visible:text-[#d4af37]"
        >
          {question}
          <span
            aria-hidden
            className={`shrink-0 text-xl font-normal text-[#d4af37] transition-transform duration-300 ${FAQ_EASE} motion-reduce:transition-none ${open ? 'rotate-45' : ''}`}
          >
            +
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        aria-hidden={!open}
        style={{ height: open ? contentHeight : 0 }}
        className={`overflow-hidden transition-[height] duration-300 ${FAQ_EASE} motion-reduce:transition-none`}
      >
        <div
          ref={contentRef}
          className={`space-y-2.5 pb-5 pr-8 font-body text-sm leading-relaxed text-white/60 transition-opacity duration-300 motion-reduce:transition-none ${open ? 'delay-100 opacity-100' : 'opacity-0'}`}
        >
          {typeof answer === 'string' ? <p>{answer}</p> : answer}
        </div>
      </div>
    </div>
  );
}

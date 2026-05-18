'use client';

import { Search } from 'lucide-react';

/**
 * GlobalSearch — pill-input с ⌘K hint'ом. Phase 1: визуальный плейсхолдер,
 * без command palette. В Phase B клик / Cmd+K откроет fuzzy-finder по
 * клиентам / салонам / страницам / каналам чата.
 */
export function GlobalSearch() {
  return (
    <div className="relative flex-1 max-w-[440px]">
      <Search
        size={14}
        className="absolute left-[14px] top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
      />
      <input
        type="text"
        placeholder="Поиск по системе (Phase 1: stub)"
        className="w-full h-[38px] bg-surface border border-line rounded-full pl-[38px] pr-[60px] text-[13px] outline-none focus:border-gold/30 transition-colors placeholder:text-text-mute"
      />
      <kbd className="absolute right-[10px] top-1/2 -translate-y-1/2 font-mono text-[11.5px] font-semibold text-text-mute bg-surface-2 px-1.5 py-0.5 rounded-md border border-line">
        ⌘K
      </kbd>
    </div>
  );
}

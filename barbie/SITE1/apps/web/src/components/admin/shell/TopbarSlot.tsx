'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * TopbarSlot — порталит заголовок/действия активного раздела в левую часть
 * глобального Topbar (`#nas-topbar-left`).
 *
 * Зачем: раньше каждая страница рисовала собственную полосу `<h1>` под Topbar —
 * две полосы съедали вертикаль. Теперь заголовок живёт в Topbar, а контент
 * страницы занимает всю оставшуюся высоту. Любой раздел использует так:
 *
 *   <TopbarSlot>
 *     <h1>…</h1>
 *     <div className="ml-auto">…действия…</div>
 *   </TopbarSlot>
 */
export function TopbarSlot({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setNode(document.getElementById('nas-topbar-left'));
  }, []);

  if (!node) return null;
  return createPortal(children, node);
}

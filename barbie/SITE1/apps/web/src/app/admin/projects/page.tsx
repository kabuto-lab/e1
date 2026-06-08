'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Database, FileCode, Plus, Sparkles } from 'lucide-react';
import { PROJECTS } from '@/lib/projects-data';
import { SalonColumn } from '@/components/admin/sections/projects/SalonColumn';
import { TopbarSlot } from '@/components/admin/shell/TopbarSlot';
import { DirtyProvider, useDirtyCount } from '@/components/admin/sections/projects/dirty-context';

/**
 * /admin/projects — визитки тенантов (восстановлено из dashboard-2077.html
 * view `#view-projects`, lines 1810-2150).
 *
 * Каждая карта — live preview бренд-идентики тенанта с editable токенами
 * (фон + 3 пары color/font). Сохранение → localStorage (см.
 * projects-storage.ts), preview → /{slug}?td=<base64 tokens> в новой
 * вкладке.
 *
 * «+ Новый тенант» — dropdown с выбором источника импорта:
 *   - WP REST API:    wizard детектит /wp-json, импортирует pages/media/menu/posts
 *   - Простой HTML:   wizard работает только с HTML-парсингом (analyzer + nav),
 *                     WP-detection panel не показывается даже если probe был бы успешен.
 *                     Полноценный HTML-crawler с sitemap.xml + boilerplate-removal —
 *                     отдельной сессией; сейчас режим даёт design-only bootstrap.
 */
export default function ProjectsPage() {
  return (
    <DirtyProvider>
      {/* Заголовок раздела живёт в Topbar (через портал) — освобождает вертикаль
          под деку. См. admin/shell/TopbarSlot.tsx. */}
      <TopbarSlot>
        <h1 className="font-display text-[16px] font-medium tracking-[-.01em] text-text m-0 whitespace-nowrap">
          Салоны <span className="text-text-mute font-light">· дека тенантов</span>
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <DirtyBadge />
          <span className="font-mono text-[11px] text-text-mute tracking-[.1em] uppercase whitespace-nowrap">
            {PROJECTS.length} САЛОНОВ · DRAFT
          </span>
          <NewTenantDropdown />
        </div>
      </TopbarSlot>

      {/* Сетка в 5 столбцов. Колонки естественной высоты, страница скроллится по вертикали. */}
      <div className="grid grid-cols-5 gap-4 pb-3 items-start">
        {PROJECTS.map((p) => (
          <SalonColumn key={p.id} project={p} />
        ))}
      </div>
    </DirtyProvider>
  );
}


/** Индикатор несохранённых изменений в Topbar. */
function DirtyBadge() {
  const n = useDirtyCount();
  if (n === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-gold tracking-[.06em] uppercase whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
      {n} не сохранено
    </span>
  );
}

function NewTenantDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Outside-click + Esc → close
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-3.5 h-9 bg-gold text-bg font-semibold rounded-md text-[12.5px] flex items-center gap-1.5"
      >
        <Plus size={14} /> Новый салон
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[280px] bg-bg-elev border border-line rounded-md shadow-xl overflow-hidden"
        >
          <DropdownItem
            icon={<Database size={16} />}
            title="WordPress REST API"
            sub="Детект /wp-json, импорт pages / media / menu / posts"
            onClick={() => go('/admin/projects/new')}
          />
          <div className="border-t border-line" />
          <DropdownItem
            icon={<FileCode size={16} />}
            title="Простой HTML импорт"
            sub="Только design tokens + nav; работает с любым сайтом"
            onClick={() => go('/admin/projects/new?mode=html')}
          />
          <div className="border-t border-line" />
          <DropdownItem
            icon={<Sparkles size={16} />}
            title="Создать с нуля"
            sub="Пустой тенант → визуальный ED-редактор страниц"
            onClick={() => go('/admin/projects/new?mode=blank')}
          />
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full text-left px-3.5 py-3 flex items-start gap-3 hover:bg-bg/40 transition-colors"
    >
      <span className="text-gold mt-0.5 shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-text">{title}</span>
        <span className="block text-[11.5px] text-text-mute mt-0.5">{sub}</span>
      </span>
    </button>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Database, FileCode, Plus } from 'lucide-react';
import { PROJECTS } from '@/lib/projects-data';
import { ProjectCard } from '@/components/admin/sections/projects/ProjectCard';

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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-[22px] font-medium tracking-[-.01em] text-text m-0">
          Проекты <span className="text-text-mute font-light">· визуальная идентика тенантов</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-text-mute tracking-[.1em] uppercase">
            {PROJECTS.length} ПРОЕКТОВ · DRAFT MODE
          </span>
          <NewTenantDropdown />
        </div>
      </div>

      <div
        className="grid gap-[18px]"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
      >
        {PROJECTS.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
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
        <Plus size={14} /> Новый тенант
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

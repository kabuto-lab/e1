'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
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
          <Link
            href="/admin/projects/new"
            className="px-3.5 h-9 bg-gold text-bg font-semibold rounded-md text-[12.5px] flex items-center gap-1.5"
          >
            <Plus size={14} /> Новый тенант
          </Link>
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

'use client';

import type { ButtonHTMLAttributes } from 'react';

export function Pill({
  active,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`px-2.5 py-1 rounded-full font-mono text-[11.5px] font-semibold uppercase tracking-wider transition-colors ${
        active
          ? 'bg-gold text-bg'
          : 'text-text-mute hover:text-text-dim'
      } ${className ?? ''}`}
    />
  );
}

/**
 * PillGroup — контейнер для табов/фильтров pill'ов. Лёгкий «ridged» фон.
 */
export function PillGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex gap-1 bg-bg-elev p-0.5 rounded-full border border-line ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

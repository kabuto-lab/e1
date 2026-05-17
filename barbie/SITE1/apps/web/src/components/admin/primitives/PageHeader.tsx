import type { ReactNode } from 'react';

/**
 * PageHeader — Unbounded h1 + optional подзаголовок и actions.
 */
export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4 pt-1">
      <div>
        <h1 className="font-display font-medium text-[22px] tracking-tight leading-tight">{title}</h1>
        {sub && (
          <div className="font-mono text-[11px] text-text-mute tracking-wider mt-1">{sub}</div>
        )}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}

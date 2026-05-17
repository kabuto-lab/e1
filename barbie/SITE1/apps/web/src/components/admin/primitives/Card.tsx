import type { ReactNode } from 'react';

/**
 * Card — базовая карточка без scoop'а. Title + sub + actions слот + content.
 */
export function Card({
  title,
  sub,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-line rounded-lg p-5 relative ${className ?? ''}`}>
      {(title || actions || sub) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <div className="font-display font-medium text-[15px] tracking-tight flex items-center gap-2.5">
                {title}
              </div>
            )}
            {sub && (
              <div className="font-mono text-[11.5px] uppercase tracking-widest text-text-mute mt-1">
                {sub}
              </div>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

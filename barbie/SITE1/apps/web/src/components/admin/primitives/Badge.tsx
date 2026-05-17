import type { ReactNode } from 'react';

/**
 * Badge — gold rounded count для rail-items и list-row'ов.
 */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[11.5px] font-semibold text-gold bg-gold/10 border border-gold/30 px-1.5 py-0.5 rounded-full ${
        className ?? ''
      }`}
    >
      {children}
    </span>
  );
}

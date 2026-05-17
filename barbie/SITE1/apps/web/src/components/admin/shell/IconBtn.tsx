import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * IconBtn — круглая icon-кнопка в topbar (notifications / settings).
 * `dot` — индикатор «новое» в правом верхнем углу.
 */
export function IconBtn({
  children,
  dot,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; dot?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`relative w-[38px] h-[38px] rounded-full bg-surface border border-line grid place-items-center text-text-dim hover:text-text hover:border-line-strong transition-colors ${
        className ?? ''
      }`}
    >
      {children}
      {dot && (
        <span
          aria-hidden="true"
          className="absolute top-[8px] right-[9px] w-[7px] h-[7px] rounded-full bg-magenta"
          style={{
            border: '2px solid rgb(var(--surface))',
            boxShadow: '0 0 6px rgb(var(--magenta) / 0.9)',
          }}
        />
      )}
    </button>
  );
}

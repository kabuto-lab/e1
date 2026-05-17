/**
 * Brand — компактная "N"-плитка как кликабельный домой-якорь rail'а.
 * Иконка-only (текст N·A·S теперь только в title/tooltip на hover).
 */
import Link from 'next/link';

export function Brand() {
  return (
    <Link
      href="/admin"
      title="NAS · Network Administration System"
      aria-label="NAS Dashboard"
      className="group relative my-3.5 mx-auto block"
    >
      <span
        className="grid place-items-center w-9 h-9 rounded-[9px] font-display font-bold text-[14px]"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--gold)), #9d7e22)',
          color: '#0A0A0B',
          boxShadow: '0 0 18px rgb(var(--gold) / 0.35), inset 0 1px 0 rgba(255,255,255,.4)',
          letterSpacing: '-0.04em',
        }}
      >
        N
      </span>
      {/* Tooltip */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1.5 rounded-md bg-bg-elev border border-line text-[12px] text-text shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50"
      >
        <div className="font-display font-semibold">
          N<span className="text-gold">·</span>A<span className="text-gold">·</span>S
        </div>
        <div className="text-[11px] text-text-mute font-mono uppercase tracking-widest mt-0.5">
          Network Administration System
        </div>
        <span
          aria-hidden="true"
          className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-line"
        />
      </span>
    </Link>
  );
}

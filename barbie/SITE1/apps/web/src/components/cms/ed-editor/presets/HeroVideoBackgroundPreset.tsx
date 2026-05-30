/**
 * HeroVideoBackgroundPreset — fullscreen hero c видео-фоном (imperiumspa-style).
 *
 * Standalone preset: НЕ требует tenant-данных — все поля в props. Это блок,
 * который дизайнер кладёт на канвас и заполняет конкретикой через Properties.
 *
 * Дефолты подобраны под imperiumspa demo (Φ7).
 */
import type { Tenant } from '@/lib/tenants';

export interface HeroVideoBackgroundProps extends Record<string, unknown> {
  videoUrl: string;
  posterUrl: string;
  overlayOpacity: number; // 0..100
  eyebrow: string;
  headline: string;
  tagline: string;
  ctaLabel: string;
  ctaHref: string;
  align: 'left' | 'center' | 'right';
}

export const heroVideoBackgroundDefaults: HeroVideoBackgroundProps = {
  videoUrl: '',
  posterUrl: '',
  overlayOpacity: 55,
  eyebrow: 'Premium spa · est. mmxxvi',
  headline: 'Premium Massage Spa',
  tagline: 'Закрытый клуб для тех, кто ценит тишину и совершенство.',
  ctaLabel: 'Забронировать',
  ctaHref: '#booking',
  align: 'left',
};

export function HeroVideoBackgroundPreset({
  props,
}: {
  props: Record<string, unknown>;
  mode?: 'editor' | 'render';
  tenant?: Tenant;
}) {
  const p = { ...heroVideoBackgroundDefaults, ...(props as Partial<HeroVideoBackgroundProps>) };
  const alignClass = p.align === 'center' ? 'text-center' : p.align === 'right' ? 'text-right' : 'text-left';

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: '#000',
        color: 'var(--head-color, #F2EBD9)',
      }}
    >
      {p.videoUrl && (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={p.posterUrl || undefined}
          src={p.videoUrl}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(0,0,0,${p.overlayOpacity / 100})`,
          zIndex: 1,
        }}
      />
      <div
        className={`container ${alignClass}`}
        style={{ position: 'relative', zIndex: 2, padding: '64px 24px', maxWidth: 1200, width: '100%' }}
      >
        <div
          className="accent"
          style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 24, fontFamily: 'var(--acc-font)', color: 'var(--acc-color)' }}
        >
          {p.eyebrow}
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 8vw, 96px)', fontWeight: 700, margin: 0, marginBottom: 32, fontFamily: 'var(--head-font)', lineHeight: 1.05 }}>
          {p.headline}
        </h1>
        <p style={{ fontSize: 22, maxWidth: 720, marginInline: p.align === 'center' ? 'auto' : undefined, marginBottom: 40, opacity: 0.9, fontStyle: 'italic' }}>
          {p.tagline}
        </p>
        {p.ctaLabel && (
          <a
            href={p.ctaHref || '#'}
            style={{
              display: 'inline-block',
              padding: '16px 40px',
              border: '2px solid var(--acc-color, #D4AF37)',
              color: 'var(--acc-color, #D4AF37)',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {p.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

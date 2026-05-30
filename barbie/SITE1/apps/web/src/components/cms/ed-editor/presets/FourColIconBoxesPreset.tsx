/**
 * FourColIconBoxesPreset — 4 колонки с икон-боксами и числами (преимущества).
 *
 * Standalone: данные в props.items[]. Дефолты — типичные для спа-салона.
 */
import * as LucideIcons from 'lucide-react';
import type { Tenant } from '@/lib/tenants';

export interface IconBoxItem {
  icon: string;
  number: string;
  title: string;
  description: string;
}

export interface FourColIconBoxesProps extends Record<string, unknown> {
  eyebrow: string;
  headline: string;
  items: IconBoxItem[];
}

export const fourColIconBoxesDefaults: FourColIconBoxesProps = {
  eyebrow: 'Почему мы',
  headline: 'Преимущества',
  items: [
    { icon: 'Sparkles', number: '01', title: 'Премиум-сервис',     description: 'Атмосфера высокого класса в каждой детали.' },
    { icon: 'ShieldCheck', number: '02', title: 'Конфиденциальность', description: 'Закрытый клуб, никаких лишних взглядов.' },
    { icon: 'Star',     number: '03', title: 'Опыт мастеров',     description: 'Только сертифицированные специалисты.' },
    { icon: 'Clock',    number: '04', title: 'Гибкий график',     description: 'Открыты ежедневно с 11:00 до 02:00.' },
  ],
};

export function FourColIconBoxesPreset({
  props,
}: {
  props: Record<string, unknown>;
  mode?: 'editor' | 'render';
  tenant?: Tenant;
}) {
  const p = { ...fourColIconBoxesDefaults, ...(props as Partial<FourColIconBoxesProps>) };
  return (
    <section className="container" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {(p.eyebrow || p.headline) && (
        <div style={{ marginBottom: 56, maxWidth: 600 }}>
          {p.eyebrow && (
            <div className="accent" style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 16, fontFamily: 'var(--acc-font)', color: 'var(--acc-color)' }}>
              {p.eyebrow}
            </div>
          )}
          {p.headline && (
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', margin: 0, fontFamily: 'var(--head-font)', color: 'var(--head-color)' }}>
              {p.headline}
            </h2>
          )}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 32,
        }}
      >
        {p.items.map((it, i) => {
          const Icon = LucideIcons[it.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }> | undefined;
          return (
            <div key={i} style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--acc-font)', color: 'var(--acc-color)', opacity: 0.6, letterSpacing: '0.2em' }}>
                  {it.number}
                </div>
                <div style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }} />
              </div>
              {Icon && (
                <div style={{ marginBottom: 16, color: 'var(--acc-color)' }}>
                  <Icon size={32} />
                </div>
              )}
              <h3 style={{ fontSize: 20, margin: '0 0 12px', fontFamily: 'var(--head-font)', color: 'var(--head-color)' }}>
                {it.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, opacity: 0.75 }}>
                {it.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

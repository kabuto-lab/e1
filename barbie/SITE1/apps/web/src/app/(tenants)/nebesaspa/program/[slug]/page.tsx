import { notFound } from 'next/navigation';
import { asset } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';
import {
  ASSET_DIR,
  PROGRAMS,
  programBySlug,
  categoriesOfProgram,
  programImg,
  fmtPrice,
  fmtDur,
} from '@/components/tenant-sites/nebesa/programs-data';

const ASSET = asset(ASSET_DIR);

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = programBySlug(slug);
  if (!p) return { title: 'Программа — НЕБОСВОД' };
  return {
    title: `${p.nm} — программа эротического массажа · НЕБОСВОД, Москва`,
    description: p.desc,
  };
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = programBySlug(slug);
  if (!p) notFound();
  const cats = categoriesOfProgram(slug);

  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <a
            href={asset('/nebesaspa/programs')}
            style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}
          >
            ← Все программы
          </a>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
              gap: 'clamp(24px, 4vw, 48px)',
              alignItems: 'start',
              marginTop: 18,
            }}
            className="program-detail"
          >
            <div
              style={{
                aspectRatio: '4 / 3',
                borderRadius: 'var(--r)',
                backgroundImage: `url(${ASSET}/${programImg(p.slug)}.webp)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 18px 48px rgba(20, 25, 40, 0.14)',
              }}
            />

            <div>
              <h1
                className="h2"
                style={{
                  fontFamily: 'var(--font-cormorant), "Playfair Display", Georgia, serif',
                  fontWeight: 300,
                  fontVariant: 'small-caps',
                  letterSpacing: '0.02em',
                  fontSize: 'clamp(34px, 4.6vw, 54px)',
                }}
              >
                {p.nm}
              </h1>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 30, color: 'var(--txt)' }}>{fmtPrice(p.price)}</span>
                <span style={{ color: 'var(--muted)', fontSize: 16 }}>· {fmtDur(p.dur)}</span>
              </div>

              <p style={{ color: '#3a3d44', fontSize: 16, lineHeight: 1.75, marginTop: 20 }}>{p.desc}</p>

              {cats.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
                  {cats.map((c) => (
                    <a
                      key={c.slug}
                      href={asset(`/nebesaspa/programs-category/${c.slug}`)}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--txt)',
                        background: '#fff',
                        border: '1px solid var(--line)',
                        borderRadius: 999,
                        padding: '7px 16px',
                      }}
                    >
                      {c.nm}
                    </a>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                <a className="btn btn-blue" href="tel:+79120767814">
                  Записаться · +7 912 076-78-14
                </a>
                <a className="btn btn-ghost" href="https://t.me/NebosvodSpa" target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
              </div>

              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 22 }}>
                Цена указана как «от». Точную стоимость под ваш сценарий назовёт администратор. Салон
                не оказывает услуги интимного характера.
              </p>
            </div>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}

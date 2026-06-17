import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { asset, tpath } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';
import {
  ASSET_DIR,
  CATEGORIES,
  categoryBySlug,
  programsOfCategory,
  programImg,
  fmtPrice,
  fmtDur,
} from '@/components/tenant-sites/nebesa/programs-data';

const ASSET = asset(ASSET_DIR);

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) return { title: 'Категория программ — НЕБОСВОД' };
  return {
    title: `${cat.nm} — НЕБОСВОД · спа-салон эротического массажа в Москве`,
    description: cat.desc,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();
  const programs = programsOfCategory(slug);
  const t = await getTranslations('nebesa');

  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <a
            href={tpath('nebesaspa', 'programs')}
            style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}
          >
            ← {t('categoryDetail.allCategories')}
          </a>
          <h1
            className="h2"
            style={{
              fontFamily: 'var(--font-cormorant), "Playfair Display", Georgia, serif',
              fontWeight: 300,
              fontVariant: 'small-caps',
              letterSpacing: '0.02em',
              fontSize: 'clamp(38px, 5.4vw, 62px)',
              marginTop: 14,
            }}
          >
            {t(`cat.${slug}.nm`)}
          </h1>
          <p style={{ maxWidth: 760, color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 18 }}>
            {t(`cat.${slug}.desc`)}
          </p>

          <div className="ptiles ptiles--short ptiles--cap" style={{ marginTop: 40 }}>
            {programs.map((p) => (
              <a className="ptile" key={p.slug} href={tpath('nebesaspa', `program/${p.slug}`)}>
                <div className="ptile-pic" style={{ backgroundImage: `url(${ASSET}/${programImg(p.slug)}.webp)` }}>
                  <div className="ptile-cap">
                    <div className="ptile-price">
                      {fmtPrice(p.price)}
                      <span className="ptile-dur">· {fmtDur(p.dur)}</span>
                    </div>
                    <div className="ptile-name">{t(`prog.${p.slug}.nm`)}</div>
                    <p className="ptile-desc">{t(`prog.${p.slug}.desc`)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {programs.length === 0 && (
            <p style={{ color: 'var(--muted)', marginTop: 24 }}>{t('categoryDetail.empty')}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              {t('categoryDetail.book')} · +7 912 076-78-14
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}

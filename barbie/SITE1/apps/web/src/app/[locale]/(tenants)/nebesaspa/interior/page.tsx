import { getTranslations } from 'next-intl/server';
import { asset } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Интерьеры — НЕБОСВОД · спа-салон',
  description:
    'Интерьеры спа-салона эротического массажа НЕБОСВОД в Москве — комфорт, приватность и премиальный сервис.',
};

const GALLERY: string[] = [
  asset('/tenants/nebesaspa-clone/img_1727-hdr-683x1024.webp'),
  asset('/tenants/nebesaspa-clone/img_1820-hdr-683x1024.webp'),
  asset('/tenants/nebesaspa-clone/img_1932-hdr-1024x683.webp'),
  asset('/tenants/nebesaspa-clone/img_1984-hdr-1024x683.webp'),
  asset('/tenants/nebesaspa-clone/img_2103-hdr-1024x683.webp'),
  asset('/tenants/nebesaspa-clone/hf_20260423_154502_f03622d9-6e81-47bf-a87e-ea24d728605c-1024x768.webp'),
];

export default async function Page() {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <NebesaShell>
      <section className="progs">
        <div className="wrap">
          <h2 className="h2">{t('interior.title')}</h2>
          <p>{t('interior.intro')}</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 14,
              marginTop: 24,
            }}
          >
            {GALLERY.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={t(`interior.gallery.${i}`)}
                style={{ width: '100%', borderRadius: 12 }}
              />
            ))}
          </div>

          <h2 className="h2" style={{ marginTop: 48 }}>
            {t('interior.section2Title')}
          </h2>
          <p>{t('interior.body1')}</p>
          <p>{t('interior.body2')}</p>

          <p style={{ marginTop: 24 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              {tc('book')}
            </a>
          </p>
        </div>
      </section>
    </NebesaShell>
  );
}

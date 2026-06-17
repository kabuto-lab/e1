import { asset, tpath } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';
import { getTranslations } from 'next-intl/server';

export const metadata = {
  title: 'Выезд — НЕБОСВОД · спа-салон',
  description:
    'Эротический массаж с выездом в Москве от салона НЕБОСВОД. Квалифицированные мастера и программы на выезд в удобной для вас обстановке.',
};

export default async function Page() {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <NebesaShell>
      <section className="progs">
        <div className="wrap">
          <h2 className="h2">{tc('nav.outcall')}</h2>

          <p>{t('vyezd.intro1')}</p>
          <p>{t('vyezd.intro2')}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, margin: '14px 0' }}>
            <img
              style={{ width: '100%', borderRadius: 12 }}
              src={asset("/tenants/nebesaspa-clone/img_2103-hdr-1024x683.webp")}
              alt={t('vyezd.imgAlt')}
            />
          </div>

          <div className="progs-track">
            <article className="pcard">
              <div className="nm">{t('vyezd.cards.oblachnoe.name')}</div>
              <div className="price">
                от 10 000 ₽ <span>90 мин</span>
              </div>
              <p>{t('vyezd.cards.oblachnoe.desc')}</p>
            </article>

            <article className="pcard">
              <div className="nm">{t('vyezd.cards.cassiopeia.name')}</div>
              <div className="price">
                от 18 000 ₽ <span>120 мин</span>
              </div>
              <p>{t('vyezd.cards.cassiopeia.desc')}</p>
            </article>

            <article className="pcard">
              <div className="nm">{t('vyezd.cards.doubleFall.name')}</div>
              <div className="price">
                от 30 000 ₽ <span>120 мин</span>
              </div>
              <p>{t('vyezd.cards.doubleFall.desc')}</p>
            </article>
          </div>

          <p style={{ marginTop: 18 }}>
            {t.rich('vyezd.contactLine', {
              phone: () => <a href="tel:+79120767814">+7 912 076-78-14</a>,
              contacts: (chunks) => <a href={tpath('nebesaspa', 'contacts')}>{chunks}</a>,
            })}
          </p>
          <p style={{ marginTop: 14 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              {t('vyezd.orderOutcall')}
            </a>
          </p>
        </div>
      </section>
    </NebesaShell>
  );
}

import { getTranslations } from 'next-intl/server';
import { asset } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Дополнения к программам — НЕБОСВОД · спа-салон',
  description:
    'Дополнения к программам эротического массажа в салоне НЕБОСВОД: бар, поцелуи по телу, контроль окончания, массаж в 4 руки, аква-пенный массаж, лесби-шоу и другое. Цены и запись.',
};

const ASSET = asset('/tenants/nebesaspa-clone');

type CatKey = 'atmo' | 'tech' | 'touch' | 'show';

// Категории дополнений — 4 смысловых блока. Подписи/заметки — в i18n (additions.cats.<key>).
const CATS: { key: CatKey }[] = [
  { key: 'atmo' },
  { key: 'tech' },
  { key: 'touch' },
  { key: 'show' },
];

// Дополнения — структура (картинка/цена/категория); названия и описания — в i18n
// (additions.items.<index>.{nm,desc}). Цены — литералы, не переводятся.
// Картинки — из локального набора nebesaspa-clone (часть исходных кадров отсутствует
// локально; назначены имеющиеся .webp, все разные).
const ADDITIONS: { img: string; price: string; cat: CatKey }[] = [
  { img: 'hf_20260423_234817_d012facf-a23a-4666-ba0e-f4fab90364ab-300x225', price: 'от 500 ₽', cat: 'atmo' },
  { img: 'hf_20260423_125533_357775de-6ff0-4285-8601-b19e78a9824b-e1776949185454-1024x768', price: 'от 1 000 ₽', cat: 'touch' },
  { img: 'hf_20260423_223324_280cdf77-ef7a-45fa-96fa-2583ed515e6b-300x225', price: 'от 1 000 ₽', cat: 'tech' },
  { img: 'hf_20260423_224929_8a1822f6-d23d-41e1-b7be-819887e7f95c-300x225', price: 'от 1 000 ₽', cat: 'atmo' },
  { img: 'hf_20260423_222840_a375d69f-e5a6-47ba-9642-2a92ed206d83-1024x768', price: 'от 1 000 ₽', cat: 'tech' },
  { img: 'hf_20260423_232711_874c484d-5ee6-4593-8809-691546416031-300x225', price: 'от 1 500 ₽', cat: 'touch' },
  { img: 'hf_20260423_154502_f03622d9-6e81-47bf-a87e-ea24d728605c-1024x768', price: 'от 1 500 ₽', cat: 'touch' },
  { img: 'hf_20260423_211635_ef3f305e-6b26-4385-9921-4e635f0da498-1024x768', price: 'от 2 000 ₽', cat: 'show' },
  { img: 'hf_20260423_213812_54336675-8a06-4ce6-b880-6a55e640e0c1-1024x768', price: 'от 3 000 ₽', cat: 'tech' },
  { img: 'hf_20260423_234001_9c9037f3-d757-4d4c-9515-cd05c5669e4d-300x225', price: 'от 3 000 ₽', cat: 'tech' },
  { img: 'hf_20260423_233608_2f1bccf9-1ec9-4dfe-ac92-b1d065b2e39d-300x225', price: 'от 3 000 ₽', cat: 'tech' },
  { img: 'hf_20260424_002651_8dcbd41f-dd59-4885-bac8-ce76b21de654-1024x768', price: 'от 3 000 ₽', cat: 'tech' },
  { img: 'hf_20260424_003235_dc656067-7565-45b8-b26b-b9dadca9c20d-1024x768', price: 'от 3 000 ₽', cat: 'show' },
  { img: 'hf_20260423_215405_fe5fd311-f577-4445-9e48-aa4ccef63ea2-1024x768', price: 'от 3 000 ₽', cat: 'show' },
  { img: 'molodye-zensiny-v-kupal-nyh-kostumah-smotrat-drug-na-druga-i-poziruut-1-scaled-1-1024x682', price: 'от 3 000 ₽', cat: 'atmo' },
  { img: 'img_1932-hdr-1024x683', price: 'от 5 000 ₽', cat: 'show' },
];

export default async function Page() {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <h1 className="h2" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>
            {tc('nav.additions')}
          </h1>
          <p style={{ maxWidth: 760, color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 18 }}>
            {t('additions.intro')}
          </p>

          {CATS.map((c) => {
            const items = ADDITIONS.map((a, i) => ({ ...a, i })).filter((a) => a.cat === c.key);
            if (items.length === 0) return null;
            return (
              <div key={c.key} style={{ marginTop: 52 }}>
                <h2 className="h2" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>
                  {t(`additions.cats.${c.key}.label`)}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
                  {t(`additions.cats.${c.key}.note`)}
                </p>

                <div className="ptiles ptiles--short">
                  {items.map((a) => (
                    <article className="ptile" key={a.i}>
                      <div
                        className="ptile-pic"
                        style={{ backgroundImage: `url(${ASSET}/${a.img}.webp)` }}
                      >
                        <div className="ptile-overlay">
                          <p>{t(`additions.items.${a.i}.desc`)}</p>
                        </div>
                      </div>
                      <div className="ptile-meta">
                        <div className="ptile-price">{a.price}</div>
                        <div className="ptile-name">{t(`additions.items.${a.i}.nm`)}</div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}

          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 28 }}>
            {t('additions.priceNote')} {t('ageGate.note')}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              {tc('book')} · +7 912 076-78-14
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}

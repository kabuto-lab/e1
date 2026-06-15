import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Акции — НЕБОСВОД · спа-салон эротического массажа в Москве',
  description:
    'Действующие акции и спецпредложения салона эротического массажа НЕБОСВОД: подарки при первом визите и сезонные предложения. Записывайтесь и уточняйте условия у администратора.',
};

// Акции — реальные предложения с nebesaspa.com (раздел «Акция»).
const OFFERS: { tag: string; nm: string; when: string; desc: string }[] = [
  {
    tag: '🚀 Сезонное',
    nm: 'Высота 120',
    when: 'с 16 по 30 июня',
    desc: 'Сезонное предложение салона на программы «на высоте». Состав подарка и условия участия уточняйте у администратора при записи.',
  },
  {
    tag: '🎁 Первый визит',
    nm: 'Первое знакомство',
    when: 'с 1 по 15 июня',
    desc: 'При первом визите в НЕБОСВОД на программу от 1,5 часов — массаж горячими апельсинами в подарок. Отличный повод познакомиться с атмосферой отдыха на высоте. Открылся новый салон у Бауманской.',
  },
];

export default function Page() {
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <h1 className="h2" style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>
            Акции
          </h1>
          <p style={{ maxWidth: 760, color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 18 }}>
            Действующие предложения салона НЕБОСВОД. Условия акций могут меняться — точные детали,
            сроки и доступность подскажет администратор при записи.
          </p>

          <div
            style={{
              display: 'grid',
              gap: 20,
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              marginTop: 40,
            }}
          >
            {OFFERS.map((o) => (
              <article
                key={o.nm}
                style={{
                  background: '#fff',
                  borderRadius: 'var(--r)',
                  padding: 'clamp(22px, 3vw, 32px)',
                  boxShadow: '0 14px 40px rgba(20, 25, 40, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>{o.tag}</span>
                <h2 className="h2" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)' }}>
                  {o.nm}
                </h2>
                <span style={{ fontSize: 14, color: '#2ba3e5', fontWeight: 700 }}>{o.when}</span>
                <p style={{ color: '#3a3d44', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{o.desc}</p>
              </article>
            ))}
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 28 }}>
            Салон не оказывает услуги интимного характера.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              Записаться · +7 912 076-78-14
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}

import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Мальчишник — Vanilia · салон эротического массажа',
  description:
    'Организуем зажигательный мальчишник в Vanilia: зона удовольствия, приватные форматы и пакет «Всё включено» с девушками, баром и шоу-программой.',
};

export default function Page() {
  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">Мальчишник</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted)', maxWidth: 640, margin: '14px auto 0' }}>
              Ищете место для зажигательного мальчишника? Мы предлагаем несколько вариантов отдыха.
            </p>

            <img
              src="/tenants/5massage/manparty-mainbg-scaled-1536x1025.webp"
              alt="Мальчишник"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--line)',
                margin: '40px 0 46px',
                maxHeight: 420,
                objectFit: 'cover',
              }}
            />

            <div className="sec-head" style={{ marginBottom: 8 }}>
              <h2>
                Варианты <span style={{ color: 'var(--accent)' }}>отдыха</span>
              </h2>
            </div>

            <div className="prog-grid">
              <div className="prog">
                <div className="nm">Зона удовольствия</div>
                <div className="desc">
                  Уютная зона с напитками, кальяном и шоу-программой для весёлой компании.
                </div>
              </div>
              <div className="prog">
                <div className="nm">Тайное общество</div>
                <div className="desc">
                  Приватный формат для закрытой вечеринки в атмосфере роскоши и азарта.
                </div>
              </div>
              <div className="prog">
                <div className="nm">Мальчишник «Всё включено»</div>
                <div className="desc">
                  Максимальный пакет: девушки, программы, бар и развлечения на весь вечер.
                </div>
              </div>
            </div>

            <div className="split" style={{ marginTop: 48 }}>
              <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                <img src="/tenants/5massage/img_1534-768x453.webp" alt="Вечеринка" />
              </div>
              <div>
                <h2>
                  Сделаем ваш мальчишник <span style={{ color: 'var(--accent)' }}>особенным!</span>
                </h2>
                <p className="sub">
                  Хотите что-то особенное? Добавим индивидуальную шоу-программу, тематический декор и
                  сюрпризы для виновника торжества.
                </p>
                <a className="btn" href="tel:+79120767223">
                  Обсудить сценарий
                </a>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 52 }}>
              <h2 className="center">Забронировать мальчишник</h2>
              <p style={{ color: 'var(--muted)', margin: '14px 0 24px' }}>
                Позвоните — подберём дату, программу и состав вечера.
              </p>
              <a className="btn" href="tel:+79120767223">
                +7 912 076-72-23
              </a>
            </div>
          </div>
        </div>
      </section>
    </VaniliaShell>
  );
}

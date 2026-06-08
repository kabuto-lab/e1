import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Дополнения — Vanilia · салон эротического массажа',
  description:
    'Дополнительные услуги к программам Vanilia: сет настоек, кальян, хаммам, джакузи, VIP-комната и консумация.',
};

const ADDONS: { img: string; alt: string; name: string; price: string; desc: string }[] = [
  { img: '/tenants/5massage/frame-45-768x512.webp', alt: 'Сет настоек', name: 'Сет настоек', price: 'от 500 ₽', desc: 'Авторские настойки к программе.' },
  { img: '/tenants/5massage/frame-58-768x512.webp', alt: 'Кальян', name: 'Кальян', price: 'от 3 000 ₽', desc: 'Премиальные табаки и сервис.' },
  { img: '/tenants/5massage/frame-37-768x512.webp', alt: 'Хаммам', name: 'Хаммам', price: 'от 3 000 ₽', desc: 'Турецкая баня с пенным массажем.' },
  { img: '/tenants/5massage/visit-1536x1023.webp', alt: 'Джакузи', name: 'Джакузи', price: 'от 3 000 ₽', desc: 'Расслабление в тёплой воде.' },
  { img: '/tenants/5massage/iskushenie.webp', alt: 'VIP-комната', name: 'VIP-комната', price: 'от 5 000 ₽', desc: 'Приватность и максимальный комфорт.' },
  { img: '/tenants/5massage/photo_2025-06-10_16-18-35.webp', alt: 'Консумация', name: 'Консумация', price: 'от 7 000 ₽', desc: 'Приятная компания и напитки.' },
];

export default function Page() {
  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">Дополнения</h2>
            <p className="center">Сделайте визит особенным — добавьте к программе атмосферу и комфорт.</p>

            <div className="prog-grid">
              {ADDONS.map((a) => (
                <div className="prog" key={a.name}>
                  <div className="ph">
                    <img src={a.img} alt={a.alt} />
                  </div>
                  <div className="nm">{a.name}</div>
                  <div className="price">{a.price}</div>
                  <div className="desc">{a.desc}</div>
                </div>
              ))}
            </div>

            <div className="center" style={{ marginTop: 40 }}>
              <p>Расскажите о пожеланиях — соберём идеальный сценарий вашего визита.</p>
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

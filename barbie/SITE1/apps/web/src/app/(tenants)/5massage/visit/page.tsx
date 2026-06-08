import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Выезд — Vanilia · салон эротического массажа',
  description:
    'Эротический массаж на выезд от Vanilia — чувственные программы у вас дома, в отеле или апартаментах. Конфиденциальность и пунктуальность.',
};

const programs = [
  {
    name: 'Тёплое начало',
    price: '10 000 ₽',
    dur: '60 мин · 12 000 ₽ с VIP-мастером',
    desc: 'Лёгкий формат для первого знакомства с выездным массажем. Расслабление, тактильность и мягкое погружение в удовольствие.',
  },
  {
    name: 'Совместное желание',
    price: '14 000 ₽',
    dur: '60 минут',
    desc: 'Чувственная программа с акцентом на взаимное наслаждение и глубокий телесный контакт.',
  },
  {
    name: 'Личное соединение',
    price: '18 000 ₽',
    dur: '90 минут',
    desc: 'Расширенный сценарий для полного расслабления и погружения в атмосферу близости.',
  },
  {
    name: 'Фирменное прикосновение',
    price: '22 000 ₽',
    dur: '90 минут',
    desc: 'Авторская выездная программа с премиальным набором техник и максимальным вниманием.',
  },
  {
    name: 'Глубокое прикосновение',
    price: '26 000 ₽',
    dur: '120 минут',
    desc: 'Максимальная продолжительность и полное погружение в чувственный ритуал.',
  },
  {
    name: 'Индивидуально',
    price: '—',
    dur: 'по договорённости',
    desc: 'Составим программу под ваш запрос. Уточните детали по телефону.',
  },
];

export default function Page() {
  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">Выезд</h2>
            <p className="center">
              Чувственный массаж там, где вам комфортно — дома, в отеле или апартаментах.
            </p>

            <div className="girls">
              <div className="girl">
                <div className="ph">
                  <img src="/tenants/5massage/visit-1536x1023.webp" alt="Выезд" />
                </div>
              </div>
            </div>

            <h2 className="center">
              Привезём <span style={{ color: 'var(--accent)' }}>атмосферу</span> к вам
            </h2>
            <p className="center">
              Профессиональная массажистка приедет в удобное для вас место с полным набором
              масел и аксессуаров. Конфиденциальность и пунктуальность гарантированы.
            </p>
            <p className="center">
              <a className="btn" href="tel:+79120767223">
                Заказать выезд
              </a>
            </p>
          </div>

          <div className="panel-sec">
            <h2 className="center">
              Программы <span style={{ color: 'var(--accent)' }}>на выезд</span>
            </h2>
            <div className="prog-grid">
              {programs.map((p) => (
                <div className="prog" key={p.name}>
                  <div className="nm">{p.name}</div>
                  <div className="price">
                    {p.price} <span>{p.dur}</span>
                  </div>
                  <div className="desc">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-sec">
            <h2 className="center">Подарок на выезд!</h2>
            <p className="center">
              Закажите выездную программу и получите приятный бонус.
            </p>
            <p className="center">
              <a className="btn" href="tel:+79120767223">
                +7 912 076-72-23
              </a>
            </p>
          </div>
        </div>
      </section>
    </VaniliaShell>
  );
}

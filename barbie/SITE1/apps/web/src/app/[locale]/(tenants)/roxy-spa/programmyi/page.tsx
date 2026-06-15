import { asset } from '@/lib/asset';
import { RoxyShell } from '@/components/tenant-sites/roxy/RoxyShell';

export const metadata = {
  title: 'Программы — ROXY Men`s Relax Club',
  description: 'Программы эротического массажа ROXY: цены и длительность за одну гостью. Основные программы, VIP и шоу, дополнительные опции.',
};

type Prog = { name: string; price: string; dur: string; desc?: string };

const main: Prog[] = [
  { name: 'Начало', price: '5 000 ₽', dur: '60 мин', desc: 'Прикоснитесь к вершине полной релаксации.' },
  { name: 'MIX+', price: '5 500 ₽', dur: '60 мин', desc: 'Нежные прикосновения сквозь пелену ароматной пены.' },
  { name: 'AquaMix', price: '7 000 ₽', dur: '60 мин', desc: 'Водные процедуры и чувственный массаж.' },
  { name: 'Foxy Staff', price: '7 000 ₽', dur: '60 мин', desc: 'Игривая программа с лёгким флиртом.' },
  { name: 'Господин', price: '7 000 ₽', dur: '60 мин', desc: 'Программа для ценителей власти и доминирования.' },
  { name: 'Для пар', price: '9 000 ₽', dur: '60 мин', desc: 'Базовая программа для двоих — начните с простого!' },
  { name: 'Фетиш', price: '9 000 ₽', dur: '60 мин', desc: 'Воплощение особых желаний и фантазий.' },
  { name: 'Lady`s relax', price: '9 000 ₽', dur: '60 мин', desc: 'Программа специально для женщин.' },
  { name: 'Эгоистка', price: '9 000 ₽', dur: '60 мин', desc: 'Всё внимание — только вашему удовольствию.' },
  { name: 'Клубничка', price: '13 000 ₽', dur: '90 мин', desc: 'Ощути сладость клубники в пышных губах наших дам!' },
  { name: 'Муладхара', price: '15 000 ₽', dur: '90 мин', desc: 'Энергетическая практика глубокого расслабления.' },
  { name: 'Экзотика', price: '16 000 ₽', dur: '90 мин', desc: 'Наслаждение в любой форме.' },
  { name: 'Пип-шоу', price: '17 000 ₽', dur: '90 мин', desc: 'Откровенное представление только для вас.' },
  { name: 'Для пар LUX', price: '18 000 ₽', dur: '120 мин', desc: 'Премиальная программа для двоих в VIP-комнате.' },
  { name: 'Femdom', price: '19 000 ₽', dur: '90 мин', desc: 'Женское доминирование для смелых.' },
];

const vip: Prog[] = [
  { name: 'Лесби шоу', price: '26 000 ₽', dur: '75 мин', desc: 'Чувственное шоу двух девушек.' },
  { name: 'Для пары LUX+', price: '40 000 ₽', dur: '120 мин', desc: 'Максимум роскоши для двоих.' },
  { name: 'Откровенное лесби', price: '40 000 ₽', dur: '90 мин', desc: 'Без границ и условностей.' },
  { name: 'Собственник', price: '45 000 ₽', dur: '180 мин', desc: 'Длительная программа полного погружения.' },
  { name: 'Искушение', price: '80 000 ₽', dur: '180 мин', desc: 'Высшая ступень наслаждения.' },
];

const extra: Prog[] = [
  { name: 'Массаж Лингама', price: '1 000 ₽', dur: '30 мин' },
  { name: 'Имитация оральных ласк', price: '1 000 ₽', dur: '30 мин' },
  { name: 'Выбор поз', price: '1 000 ₽', dur: '30 мин' },
  { name: 'Фетиш (опция)', price: '1 000 ₽', dur: '30 мин' },
  { name: 'Массаж простаты', price: '2 000 ₽', dur: '30 мин' },
  { name: 'Страпон', price: '5 000 ₽', dur: '30 мин' },
];

function ProgGrid({ items }: { items: Prog[] }) {
  return (
    <div className="prog-grid">
      {items.map((p, i) => (
        <div className="prog" key={`${p.name}-${i}`}>
          <div
            className="ph"
            style={{
              backgroundImage: `url(${asset(`/tenants/roxy-spa/prog-${(i % 8) + 1}.webp`)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="body">
            <div className="name">{p.name}</div>
            <div className="meta">
              <span>{p.price}</span>
              <span>{p.dur}</span>
            </div>
            {p.desc ? <p className="desc">{p.desc}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <RoxyShell>
      <section className="rose-bg">
        <div className="wrap">
          <h2 className="sec-title">Программы</h2>
          <p className="sec-sub">
            Доводящие до предела всех ощущений программы. Длительность и стоимость указаны за одну гостью.
          </p>

          <div className="about">
            <h2>Основные программы</h2>
          </div>
          <ProgGrid items={main} />

          <div className="about" style={{ marginTop: '48px' }}>
            <h2>VIP и шоу</h2>
          </div>
          <ProgGrid items={vip} />

          <div className="about" style={{ marginTop: '48px' }}>
            <h2>Дополнительные опции</h2>
          </div>
          <ProgGrid items={extra} />

          <div className="about" style={{ marginTop: '48px' }}>
            <p>
              Салон не оказывает услуг интимного характера. Посещая наш салон, вы соглашаетесь с правилами нашего
              заведения.
            </p>
            <p style={{ marginTop: '20px' }}>
              <a className="btn-outline" href="tel:+74997572501">
                Записаться · 8 (499) 757-2501
              </a>
            </p>
          </div>
        </div>
      </section>
    </RoxyShell>
  );
}

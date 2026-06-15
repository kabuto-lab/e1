import { asset } from '@/lib/asset';
import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Программы — PENTAGON spa salon',
  description:
    'Программы эротического массажа в салоне PENTAGON — от экспресс-программ до VIP. Цены, длительность, описание.',
};

const programs = [
  {
    img: 'ee',
    title: 'Экспресс эротик',
    desc: 'Быстрое яркое знакомство с миром эротического массажа.',
    price: '5 000 ₽',
    dur: '30 мин · 1 мастер',
  },
  {
    img: 'lz',
    title: 'Первый раз',
    desc: 'Нежные прикосновения мягких и чувственных губ девушки к вашему телу.',
    price: '7 000 ₽',
    dur: '60 мин · 1 мастер',
  },
  {
    img: 'lz',
    title: 'Лёгкое забвение',
    desc: 'Сладкие ароматы фруктов и нежные поцелуи вознесут вас на вершину удовольствия.',
    price: '10 000 ₽',
    dur: '60 мин · 1 мастер',
  },
  {
    img: 'elina',
    title: 'Экзотика',
    desc: 'Особенная программа для самых смелых желаний.',
    price: '13 000 ₽',
    dur: '75 мин · 1 мастер',
  },
  {
    img: 'mechta1',
    title: 'Мечта',
    desc: 'Воплощение фантазий в комфортной и стильной обстановке.',
    price: '18 000 ₽',
    dur: '90 мин · 1 мастер',
  },
  {
    img: 'snezhana-1',
    title: 'Незнакомка',
    desc: 'Интрига, лёгкое волнение и полное погружение в ощущения.',
    price: '20 000 ₽',
    dur: '90 мин · 1 мастер',
  },
  {
    img: 'poczelui-1024x683-1',
    title: 'Пип-шоу',
    desc: 'Соблазнительная красавица позволит понаблюдать, как она ласкает себя.',
    price: '22 000 ₽',
    dur: '60 мин · 1 мастер',
  },
  {
    img: 'velichie2',
    title: 'Величие (лесби-шоу)',
    desc: 'Феерия с участием двух мастериц — зрелище и наслаждение.',
    price: '25 000 ₽',
    dur: '90 мин · 2 мастера',
  },
  {
    img: 'image-2020-12-24-163617-1024x576-1',
    title: 'Двойная фиерия',
    desc: 'Двойное внимание, двойное удовольствие в шикарной атмосфере.',
    price: '30 000 ₽',
    dur: '120 мин · 2 мастера',
  },
  {
    img: 'andrea',
    title: 'Откровение',
    desc: 'Самая откровенная и насыщенная программа салона.',
    price: '40 000 ₽',
    dur: '120 мин · 2 мастера',
  },
  {
    img: '1111-kopiya-scaled',
    title: 'Мальчишник STANDART',
    desc: 'Праздничная программа для компании. Индивидуальные условия.',
    price: '50 000 ₽',
    dur: '180 мин · группа',
  },
  {
    img: 'photo_5287363681115553350_y-1024x683-1',
    title: 'Мальчишник VIP',
    desc: 'Расширенная программа с несколькими мастерицами и шоу.',
    price: '80 000 ₽',
    dur: '180 мин · группа',
  },
  {
    img: 'tracey_1',
    title: 'Мальчишник PREMIUM',
    desc: 'Максимальная программа для незабываемого праздника.',
    price: '114 000 ₽',
    dur: '240 мин · группа',
  },
];

/**
 * (tenants)/pentagon/program — внутренняя страница тенанта pentagon в едином стиле
 * с главной (PentagonShell + pentagon.css). Прайс программ массажа.
 */
export default function Page() {
  return (
    <PentagonShell>
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">PENTAGON · Прайс</span>
            <h2>Программы</h2>
            <p>
              Уникальные программы на любой вкус — от лёгкого знакомства до полного погружения с
              двумя мастерицами. В своей работе мы практикуем индивидуальный подход.
            </p>
          </div>

          <div className="progs">
            {programs.map((p, i) => (
              <div className="prog" key={`${p.title}-${i}`}>
                <div className="ic">❖</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="meta">
                  <span>{p.price}</span>
                  <span>{p.dur}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <a className="btn btn-accent" href={asset("/pentagon/contacts")}>
              Записаться на программу
            </a>
          </div>
        </div>
      </section>
    </PentagonShell>
  );
}

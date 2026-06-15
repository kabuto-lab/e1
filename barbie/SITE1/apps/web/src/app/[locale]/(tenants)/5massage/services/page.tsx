import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Услуги — Vanilia · салон эротического массажа',
  description:
    'Авторские программы эротического массажа Vanilia — от лёгкого знакомства до эксклюзивных ритуалов. Цены и длительность.',
};

const programs = [
  {
    name: 'Шёлковое прикосновение',
    price: '5 000 ₽',
    dur: '60 минут',
    desc: 'Глубокий расслабляющий массаж всего тела с мягким погружением в чувственную атмосферу. Тепло камней, аромат цитрусов и проработка.',
  },
  {
    name: 'Мягкое желание',
    price: '5 000 ₽',
    dur: '30 минут',
    desc: 'Идеальный первый шаг в мир эротического массажа. Коротко, ясно и чувственно — с акцентом на телесный контакт и удовольствие.',
  },
  {
    name: 'Аква-Гармония',
    price: '6 000 ₽',
    dur: '60 минут',
    desc: 'Баланс телесного расслабления и эротического наслаждения. Глубокая проработка мышц плавно переходит в чувственные техники.',
  },
  {
    name: 'Мой господин',
    price: '8 000 ₽',
    dur: '60 минут',
    desc: 'Программа для тех, кто любит контроль, подчинение и игру ролей. Атмосфера власти и полного доверия.',
  },
  {
    name: 'Клубничное искушение',
    price: '9 000 ₽',
    dur: '60 / 90 минут',
    desc: 'Сладкая программа с акцентом на удовольствие. 60 минут — 9 000 ₽, 90 минут — 13 000 ₽.',
  },
  {
    name: 'Между нами',
    price: '10 000 ₽',
    dur: '60 минут',
    desc: 'Мягкая и комфортная программа для первого знакомства с форматом «для двоих». Акцент на расслабление и телесную гармонию.',
  },
];

const categories = [
  { name: 'Основные программы', desc: 'Базовые форматы для знакомства с эротическим массажем.' },
  { name: 'VIP программы', desc: 'Расширенный сценарий в VIP-комнате с дополнительными опциями.' },
  { name: 'Программы для пар', desc: 'Чувственный массаж для двоих в комфортной атмосфере.' },
  { name: 'Программы для девушек', desc: 'Деликатные сценарии, разработанные для гостей-женщин.' },
  { name: 'Deluxe программы', desc: 'Премиальные ритуалы максимальной продолжительности.' },
  { name: 'Эксклюзивные программы', desc: 'Авторские сценарии под индивидуальный запрос гостя.' },
];

export default function Page() {
  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">Услуги</h2>
            <p className="center">
              Авторские программы эротического массажа — от лёгкого знакомства до эксклюзивных ритуалов.
            </p>

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
            <h2 className="center">
              Категории <span style={{ color: 'var(--accent)' }}>программ</span>
            </h2>
            <div className="prog-grid">
              {categories.map((c) => (
                <div className="prog" key={c.name}>
                  <div className="nm">{c.name}</div>
                  <div className="desc">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-sec">
            <h2 className="center">Записаться на массаж</h2>
            <p className="center">
              Позвоните, и мы подберём программу и девушку под ваши пожелания.
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
